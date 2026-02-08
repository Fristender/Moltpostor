import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";
import type { MoltbookPost, MoltbookSubmolt, MoltbookFeedResponse } from "@moltpostor/core";
import { isSubmoltPinned, pinSubmolt, unpinSubmolt, isSubscribed as isSubscribedStored, setSubscribed as setSubscribedStored, detectSubscribeStatus } from "./pins";
import { useAppContext } from "./AppContext";

function normalizePosts(data: MoltbookFeedResponse | MoltbookPost[] | null): MoltbookPost[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.posts)) return data.posts;
  return [];
}

export function SubmoltView(props: { api: MoltbookApi; name: string; onOpenPost: (id: string) => void }) {
  const { addToHistory, cacheContent, getCachedContent } = useAppContext();
  const [page, setPage] = useState(1);
  const [submolt, setSubmolt] = useState<MoltbookSubmolt | null>(null);
  const [posts, setPosts] = useState<MoltbookPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [subscribed, setSubscribed] = useState(() => isSubscribedStored(props.name));
  const [subBusy, setSubBusy] = useState(false);
  const [pinned, setPinned] = useState(() => isSubmoltPinned(props.name));

  useEffect(() => {
    setPage(1);
    setPinned(isSubmoltPinned(props.name));
    setSubscribed(isSubscribedStored(props.name));
    setUsingCache(false);
  }, [props.name]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const s = await props.api.getSubmolt(props.name);
        if (!cancelled) {
          detectSubscribeStatus(s, props.name);
          setSubscribed(isSubscribedStored(props.name));
          const submoltData = (s.submolt ?? s) as MoltbookSubmolt;
          setSubmolt(submoltData);
          // Cache submolt info
          const f = await props.api.getSubmoltFeed(props.name, page);
          if (cancelled) return;
          const postsData = normalizePosts(f);
          setPosts(postsData);
          setUsingCache(false);
          // Cache for offline access
          cacheContent({
            id: props.name,
            platform: "moltbook",
            type: "submolt",
            data: { submolt: submoltData, posts: postsData },
          });
        }
      } catch (e: unknown) {
        if (cancelled) return;
        // Try to load from cache
        const cached = getCachedContent("moltbook", "submolt", props.name);
        if (cached) {
          setSubmolt(cached.submolt as MoltbookSubmolt);
          setPosts((cached.posts as MoltbookPost[]) ?? []);
          setUsingCache(true);
          setError(null);
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, props.api, props.name]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Track in watch history when submolt is loaded
  useEffect(() => {
    if (!submolt) return;
    const historyItem: Parameters<typeof addToHistory>[0] = {
      id: props.name,
      platform: "moltbook",
      type: "submolt",
      name: props.name,
    };
    if (submolt.display_name) historyItem.title = String(submolt.display_name);
    addToHistory(historyItem);
  }, [submolt, props.name, addToHistory]);

  const handleSubscribe = async () => {
    setSubBusy(true);
    try {
      if (subscribed) {
        const res = await props.api.unsubscribeSubmolt(props.name);
        const isNowSubscribed = res?.action === "none";
        setSubscribedStored(props.name, isNowSubscribed);
        setSubscribed(isNowSubscribed);
      } else {
        const res = await props.api.subscribeSubmolt(props.name);
        const isNowSubscribed = res?.action !== "unsubscribed";
        setSubscribedStored(props.name, isNowSubscribed);
        setSubscribed(isNowSubscribed);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubBusy(false);
    }
  };

  const handlePin = () => {
    if (pinned) {
      unpinSubmolt(props.name);
      setPinned(false);
    } else {
      pinSubmolt(props.name);
      setPinned(true);
    }
  };

  return (
    <section>
      {usingCache && (
        <div style={{ padding: "8px 12px", marginBottom: 12, background: "var(--color-bg-accent)", borderRadius: 6, fontSize: 13 }}>
          Showing cached version (offline)
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>m/{props.name}</h2>
          {submolt?.display_name ? <div style={{ opacity: 0.8 }}>{String(submolt.display_name)}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleSubscribe} disabled={subBusy}>
            {subscribed ? "Unsubscribe" : "Subscribe"}
          </button>
          <button onClick={handlePin}>
            {pinned ? "Unpin" : "Pin"}
          </button>
          <a href={`https://www.moltbook.com/m/${encodeURIComponent(props.name)}`} target="_blank" rel="noreferrer noopener">
            View on Moltbook
          </a>
        </div>
      </div>

      {submolt?.description ? <p style={{ opacity: 0.9 }}>{String(submolt.description)}</p> : null}

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => {
          const id = String(p.id ?? "");
          const score = (p.upvotes ?? 0) - (p.downvotes ?? 0);
          const authorName = p.author ? (typeof p.author === "string" ? p.author : p.author.name ?? "") : "";
          return (
            <article key={id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{String(p.title ?? "")}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {authorName ? (
                      <a href={`#/u/${encodeURIComponent(authorName)}`}>u/{authorName}</a>
                    ) : (
                      ""
                    )}{" "}
                    {p.created_at ? `- ${p.created_at}` : ""}
                  </div>
                </div>
                <div style={{ minWidth: 80, textAlign: "right" }}>Score: {score}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => props.onOpenPost(id)} disabled={!id}>
                  Open
                </button>
                {p.url && (
                  <a href={String(p.url)} target="_blank" rel="noreferrer noopener">
                    Link
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <div>Page {page}</div>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </section>
  );
}
