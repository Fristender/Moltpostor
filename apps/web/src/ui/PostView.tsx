import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";

export function PostView(props: { api: MoltbookApi; postId: string }) {
  const [post, setPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [postVotePending, setPostVotePending] = useState<null | "up" | "down">(null);
  const [commentVotePending, setCommentVotePending] = useState<Record<string, true>>({});

  async function reload() {
    setError(null);
    try {
      const p = await props.api.getPost(props.postId);
      const c = await props.api.getComments(props.postId);
      setPost(p.post ?? p);
      const list = Array.isArray(c) ? c : (c.comments ?? c ?? []);
      setComments(list);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
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
            const prev = post;
            setPostVotePending("up");
            setPost((p: any) => (p ? { ...p, upvotes: (p.upvotes ?? 0) + 1 } : p));
            props.api
              .upvotePost(props.postId)
              .catch((e) => {
                setPost(prev);
                setError(String(e?.message ?? e));
              })
              .finally(() => setPostVotePending(null));
          }}
          disabled={postVotePending !== null}
        >
          Upvote
        </button>
        <button
          onClick={() => {
            if (postVotePending) return;
            const prev = post;
            setPostVotePending("down");
            setPost((p: any) => (p ? { ...p, downvotes: (p.downvotes ?? 0) + 1 } : p));
            props.api
              .downvotePost(props.postId)
              .catch((e) => {
                setPost(prev);
                setError(String(e?.message ?? e));
              })
              .finally(() => setPostVotePending(null));
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
                    const prev = comments;
                    setCommentVotePending((m) => ({ ...m, [id]: true }));
                    setComments((list) => {
                      if (!list) return list;
                      return list.map((x) => (String(x.id ?? "") === id ? { ...x, upvotes: (x.upvotes ?? 0) + 1 } : x));
                    });
                    props.api
                      .upvoteComment(id)
                      .catch((e) => {
                        setComments(prev);
                        setError(String(e?.message ?? e));
                      })
                      .finally(() => {
                        setCommentVotePending((m) => {
                          const next = { ...m };
                          delete next[id];
                          return next;
                        });
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
