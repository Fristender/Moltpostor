import React, { useEffect, useRef, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";

export function PostView(props: { api: MoltbookApi; postId: string }) {
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [postVotePending, setPostVotePending] = useState<null | "up" | "down">(null);
  const [commentVotePending, setCommentVotePending] = useState<Record<string, true>>({});
  // Client-side vote state (API doesn't currently expose "my vote" in our models).
  // We assume Moltbook vote endpoints toggle.
  const [postMyVote, setPostMyVote] = useState<null | "up" | "down">(null);
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
      setPost(p.post ?? p);
      const list = Array.isArray(c) ? c : (c.comments ?? c ?? []);
      setComments(list);
    } catch (e: any) {
      if (seq !== reloadSeqRef.current) return;
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    // When navigating to a new post, reset local vote state.
    setPostMyVote(null);
    setCommentMyVote({});
    // Cancel any scheduled reconcile from the previous post.
    if (reconcileTimerRef.current !== null) {
      window.clearTimeout(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.postId]);

  if (error) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!post) return <div>Loading…</div>;

  const score = (post.upvotes ?? 0) - (post.downvotes ?? 0);

  return (
    <section>
      <h2>{String(post.title ?? "")}</h2>
      <div style={{ fontSize: 12, opacity: 0.75 }}>
        {post.submolt ? `s/${post.submolt.name ?? post.submolt}` : ""} {post.author ? ` · u/${post.author.name ?? post.author}` : ""}{" "}
        {post.created_at ? ` · ${post.created_at}` : ""} · score {score}
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

            props.api
              .upvotePost(props.postId)
              .catch((e) => {
                setPost(prevPost);
                setPostMyVote(prevMyVote);
                setError(String(e?.message ?? e));
              })
              .finally(() => {
                setPostVotePending(null);
                // Reconcile with server truth after user stops clicking.
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

            props.api
              .downvotePost(props.postId)
              .catch((e) => {
                setPost(prevPost);
                setPostMyVote(prevMyVote);
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
          return (
            <article key={id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {c.author ? `u/${c.author.name ?? c.author}` : ""} {c.created_at ? ` · ${c.created_at}` : ""}
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
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
