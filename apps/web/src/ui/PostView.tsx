import React, { useEffect, useRef, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";
import { useAppContext } from "./AppContext";

type Vote = null | "up" | "down";

function postVoteKey(postId: string) {
  return `moltpostor.vote.post.v1.${postId}`;
}

function commentVoteKey(commentId: string) {
  return `moltpostor.vote.comment.v1.${commentId}`;
}

function readVote(key: string): Vote {
  try {
    const v = localStorage.getItem(key);
    if (v === "up" || v === "down") return v;
    return null;
  } catch {
    return null;
  }
}

function writeVote(key: string, vote: Vote) {
  try {
    if (vote) localStorage.setItem(key, vote);
    else localStorage.removeItem(key);
  } catch {
    // ignore (private mode, storage disabled, etc.)
  }
}

export function PostView(props: { api: MoltbookApi; postId: string }) {
  const { saveItem, unsaveItem, isSaved, addToHistory, cacheContent, getCachedContent } = useAppContext();
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [comment, setComment] = useState("");
  const [postVotePending, setPostVotePending] = useState<null | "up" | "down">(null);
  const [commentVotePending, setCommentVotePending] = useState<Record<string, true>>({});

  // Client-side vote state (API doesn't currently expose "my vote" in our models).
  // We assume Moltbook vote endpoints toggle.
  const [postMyVote, setPostMyVote] = useState<Vote>(null);
  const [commentMyVote, setCommentMyVote] = useState<Record<string, "up">>({});

  const reloadSeqRef = useRef(0);
  const reconcileTimerRef = useRef<number | null>(null);

  function scheduleReconcile() {
    // Coalesce multiple vote completions into one reload, and ignore stale reloads.
    if (reconcileTimerRef.current !== null) window.clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = window.setTimeout(() => {
      reconcileTimerRef.current = null;
      void reload();
    }, 400);
  }

  async function reload() {
    const seq = ++reloadSeqRef.current;
    try {
      const p = await props.api.getPost(props.postId);
      const c = await props.api.getComments(props.postId);
      if (seq !== reloadSeqRef.current) return;
      setError(null);
      setUsingCache(false);
      const postData = p.post ?? p;
      const commentList = Array.isArray(c) ? c : (c.comments ?? c ?? []);
      setPost(postData);
      setComments(commentList);
      // Cache the content for offline access
      cacheContent({
        id: props.postId,
        platform: "moltbook",
        type: "post",
        data: { post: postData, comments: commentList },
      });
    } catch (e: any) {
      if (seq !== reloadSeqRef.current) return;
      // Try to load from cache on error
      const cached = getCachedContent("moltbook", "post", props.postId);
      if (cached) {
        setPost(cached.post);
        setComments(cached.comments ?? []);
        setUsingCache(true);
        setError(null);
      } else {
        setError(e?.message ?? String(e));
      }
    }
  }

  useEffect(() => {
    // When navigating to a new post, seed local vote state from storage.
    setPostMyVote(readVote(postVoteKey(props.postId)));
    setCommentMyVote({});
    // Cancel any scheduled reconcile from the previous post.
    if (reconcileTimerRef.current !== null) {
      window.clearTimeout(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.postId]);

  // Track in watch history when post data is loaded
  useEffect(() => {
    if (!post) return;
    const postAuthor = post.author ? String(post.author.name ?? post.author) : undefined;
    const historyItem: Parameters<typeof addToHistory>[0] = {
      id: props.postId,
      platform: "moltbook",
      type: "post",
      title: String(post.title ?? ""),
    };
    if (postAuthor) historyItem.author = postAuthor;
    if (post.url) historyItem.url = String(post.url);
    if (post.content) historyItem.content = String(post.content).slice(0, 200);
    addToHistory(historyItem);
  }, [post, props.postId, addToHistory]);

  useEffect(() => {
    // Whenever a new comment list comes in, hydrate known per-comment vote state.
    if (!comments) return;
    const next: Record<string, "up"> = {};
    for (const c of comments) {
      const id = String(c?.id ?? "");
      if (!id) continue;
      const v = readVote(commentVoteKey(id));
      if (v === "up") next[id] = "up";
    }
    setCommentMyVote(next);
  }, [comments]);

  if (error) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!post) return <div>Loading...</div>;

  const score = (post.upvotes ?? 0) - (post.downvotes ?? 0);
  const postAuthorName = post.author ? String(post.author.name ?? post.author) : "";
  const postSubmoltName = post.submolt ? String(post.submolt.name ?? post.submolt) : "";

  return (
    <section>
      {usingCache && (
        <div style={{ padding: "8px 12px", marginBottom: 12, background: "var(--color-bg-accent)", borderRadius: 6, fontSize: 13 }}>
          Showing cached version (offline)
        </div>
      )}
      <h2>{String(post.title ?? "")}</h2>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        {postSubmoltName ? (
          <>
            <a
              href={`#/m/${encodeURIComponent(postSubmoltName)}`}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = `#/m/${encodeURIComponent(postSubmoltName)}`;
              }}
            >
              m/{postSubmoltName}
            </a>
          </>
        ) : null}
        {postAuthorName ? (
          <>
            {" - "}
            <a href={`#/u/${encodeURIComponent(postAuthorName)}`}>u/{postAuthorName}</a>
          </>
        ) : null}
        {post.created_at ? ` - ${post.created_at}` : ""} - score {score}
      </div>

      {post.url && (
        <div style={{ marginTop: 8 }}>
          <a href={String(post.url)} target="_blank" rel="noreferrer noopener">
            {String(post.url)}
          </a>
        </div>
      )}
      {post.content && <pre style={{ whiteSpace: "pre-wrap" }}>{String(post.content)}</pre>}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            if (postVotePending) return;
            const prevPost = post;
            const prevMyVote = postMyVote;
            setPostVotePending("up");

            setPost((p: any) => {
              if (!p) return p;
              const up = p.upvotes ?? 0;
              const down = p.downvotes ?? 0;
              if (prevMyVote === "up") return { ...p, upvotes: up - 1 }; // remove upvote
              if (prevMyVote === "down") return { ...p, upvotes: up + 1, downvotes: down - 1 }; // switch
              return { ...p, upvotes: up + 1 }; // add upvote
            });
            setPostMyVote((v) => (v === "up" ? null : "up"));
            writeVote(postVoteKey(props.postId), prevMyVote === "up" ? null : "up");

            props.api
              .upvotePost(props.postId)
              .catch((e) => {
                setPost(prevPost);
                setPostMyVote(prevMyVote);
                writeVote(postVoteKey(props.postId), prevMyVote);
                setError(String(e?.message ?? e));
              })
              .finally(() => {
                setPostVotePending(null);
                scheduleReconcile();
              });
          }}
          disabled={postVotePending !== null}
        >
          Upvote
        </button>
        <button
          onClick={() => {
            if (postVotePending) return;
            const prevPost = post;
            const prevMyVote = postMyVote;
            setPostVotePending("down");

            setPost((p: any) => {
              if (!p) return p;
              const up = p.upvotes ?? 0;
              const down = p.downvotes ?? 0;
              if (prevMyVote === "down") return { ...p, downvotes: down - 1 }; // remove downvote
              if (prevMyVote === "up") return { ...p, downvotes: down + 1, upvotes: up - 1 }; // switch
              return { ...p, downvotes: down + 1 }; // add downvote
            });
            setPostMyVote((v) => (v === "down" ? null : "down"));
            writeVote(postVoteKey(props.postId), prevMyVote === "down" ? null : "down");

            props.api
              .downvotePost(props.postId)
              .catch((e) => {
                setPost(prevPost);
                setPostMyVote(prevMyVote);
                writeVote(postVoteKey(props.postId), prevMyVote);
                setError(String(e?.message ?? e));
              })
              .finally(() => {
                setPostVotePending(null);
                scheduleReconcile();
              });
          }}
          disabled={postVotePending !== null}
        >
          Downvote
        </button>
        <button
          onClick={() => {
            const postSaved = isSaved("moltbook", "post", props.postId);
            if (postSaved) {
              unsaveItem("moltbook", "post", props.postId);
            } else {
              const item: Parameters<typeof saveItem>[0] = {
                id: props.postId,
                platform: "moltbook",
                type: "post",
                title: String(post.title ?? ""),
              };
              if (post.content) item.content = String(post.content).slice(0, 200);
              if (postAuthorName) item.author = postAuthorName;
              if (post.url) item.url = String(post.url);
              saveItem(item);
            }
          }}
        >
          {isSaved("moltbook", "post", props.postId) ? "Unsave" : "Save"}
        </button>
        <a href={`https://www.moltbook.com/post/${encodeURIComponent(props.postId)}`} target="_blank" rel="noreferrer noopener">
          View on Moltbook
        </a>
      </div>

      <hr />

      <h3>Comments</h3>
      <label>
        Add comment
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} style={{ width: "100%" }} />
      </label>
      <button
        onClick={() => {
          const c = comment.trim();
          if (!c) return;
          props.api
            .createComment(props.postId, { content: c })
            .then(() => {
              setComment("");
              return reload();
            })
            .catch((e) => setError(String(e?.message ?? e)));
        }}
        disabled={!comment.trim()}
      >
        Post comment
      </button>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {(comments ?? []).map((c) => {
          const id = String(c.id ?? "");
          const score = (c.upvotes ?? 0) - (c.downvotes ?? 0);
          const votePending = !!commentVotePending[id];
          const myVote = commentMyVote[id] ?? null;
          const commentAuthorName = c.author ? String(c.author.name ?? c.author) : "";

          return (
            <article key={id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {commentAuthorName ? <a href={`#/u/${encodeURIComponent(commentAuthorName)}`}>u/{commentAuthorName}</a> : ""}{" "}
                  {c.created_at ? `- ${c.created_at}` : ""}
                </div>
                <div>score {score}</div>
              </div>
              <pre style={{ whiteSpace: "pre-wrap" }}>{String(c.content ?? "")}</pre>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    if (!id || votePending) return;
                    const prevComments = comments;
                    const prevMyVote = myVote;
                    setCommentVotePending((m) => ({ ...m, [id]: true }));

                    setComments((list) => {
                      if (!list) return list;
                      return list.map((x) => {
                        if (String(x.id ?? "") !== id) return x;
                        const up = x.upvotes ?? 0;
                        // Toggle: clicking Upvote again removes.
                        return prevMyVote === "up" ? { ...x, upvotes: up - 1 } : { ...x, upvotes: up + 1 };
                      });
                    });
                    setCommentMyVote((m) => {
                      const next = { ...m };
                      if (prevMyVote === "up") delete next[id];
                      else next[id] = "up";
                      return next;
                    });
                    writeVote(commentVoteKey(id), prevMyVote === "up" ? null : "up");

                    props.api
                      .upvoteComment(id)
                      .catch((e) => {
                        setComments(prevComments);
                        setCommentMyVote((m) => {
                          const next = { ...m };
                          if (prevMyVote === "up") next[id] = "up";
                          else delete next[id];
                          return next;
                        });
                        writeVote(commentVoteKey(id), prevMyVote === "up" ? "up" : null);
                        setError(String(e?.message ?? e));
                      })
                      .finally(() => {
                        setCommentVotePending((m) => {
                          const next = { ...m };
                          delete next[id];
                          return next;
                        });
                        scheduleReconcile();
                      });
                  }}
                  disabled={!id || votePending}
                >
                  Upvote
                </button>
                <button
                  onClick={() => {
                    const commentSaved = isSaved("moltbook", "comment", id);
                    if (commentSaved) {
                      unsaveItem("moltbook", "comment", id);
                    } else {
                      const item: Parameters<typeof saveItem>[0] = {
                        id,
                        platform: "moltbook",
                        type: "comment",
                        parentId: props.postId,
                      };
                      if (c.content) item.content = String(c.content).slice(0, 200);
                      if (commentAuthorName) item.author = commentAuthorName;
                      saveItem(item);
                    }
                  }}
                >
                  {isSaved("moltbook", "comment", id) ? "Unsave" : "Save"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

