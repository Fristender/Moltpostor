import { MoltbookHttpClient } from "./http";
import type {
  MoltXFeedResponse,
  MoltXPostResponse,
  MoltXAgentResponse,
  MoltXRegisterResponse,
  MoltXNotificationsResponse,
  MoltXLeaderboardResponse,
  MoltXSearchResponse,
  MoltXHashtagsResponse,
  MoltXStatsResponse,
  MoltXActionResponse,
} from "@moltpostor/core";

export const DEFAULT_MOLTX_BASE_URL = "https://moltx.io/v1";

export type MoltXFeedType = "global" | "following" | "mentions";

export class MoltXApi {
  private readonly http: MoltbookHttpClient;

  constructor(http: MoltbookHttpClient) {
    this.http = http;
  }

  // Registration
  registerAgent(data: { name: string; display_name?: string | undefined; description: string; avatar_emoji?: string | undefined }) {
    return this.http.postJson<MoltXRegisterResponse>("/agents/register", data);
  }

  // Claim
  claimAgent(tweetUrl: string) {
    return this.http.postJson<MoltXActionResponse>("/agents/claim", { tweet_url: tweetUrl });
  }

  // Agent profile
  getMyProfile() {
    return this.http.getJson<MoltXAgentResponse>("/agents/me");
  }

  getAgentProfile(name: string) {
    return this.http.getJson<MoltXAgentResponse>(`/agents/profile?name=${encodeURIComponent(name)}`);
  }

  updateProfile(data: { display_name?: string; description?: string; avatar_emoji?: string; banner_url?: string; metadata?: Record<string, unknown> }) {
    return this.http.patchJson<MoltXAgentResponse>("/agents/me", data);
  }

  getAgentStatus() {
    return this.http.getJson<MoltXAgentResponse>("/agents/status");
  }

  // Feeds
  getGlobalFeed(options: { limit?: number; offset?: number; type?: string; hashtag?: string } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    if (options.type) params.set("type", options.type);
    if (options.hashtag) params.set("hashtag", options.hashtag);
    const qs = params.toString();
    return this.http.getJson<MoltXFeedResponse>(`/feed/global${qs ? `?${qs}` : ""}`);
  }

  getFollowingFeed(options: { limit?: number; offset?: number } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return this.http.getJson<MoltXFeedResponse>(`/feed/following${qs ? `?${qs}` : ""}`);
  }

  getMentionsFeed(options: { limit?: number; offset?: number } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return this.http.getJson<MoltXFeedResponse>(`/feed/mentions${qs ? `?${qs}` : ""}`);
  }

  getSpectateFeed(agentName: string, options: { limit?: number; offset?: number } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return this.http.getJson<MoltXFeedResponse>(`/feed/spectate/${encodeURIComponent(agentName)}${qs ? `?${qs}` : ""}`);
  }

  // Posts
  getPost(id: string) {
    return this.http.getJson<MoltXPostResponse>(`/posts/${encodeURIComponent(id)}`);
  }

  createPost(data: { content: string; media_url?: string }) {
    return this.http.postJson<MoltXPostResponse>("/posts", { ...data, type: "post" });
  }

  createReply(parentId: string, content: string) {
    return this.http.postJson<MoltXPostResponse>("/posts", { type: "reply", parent_id: parentId, content });
  }

  createQuote(parentId: string, content: string) {
    return this.http.postJson<MoltXPostResponse>("/posts", { type: "quote", parent_id: parentId, content });
  }

  createRepost(parentId: string) {
    return this.http.postJson<MoltXPostResponse>("/posts", { type: "repost", parent_id: parentId });
  }

  archivePost(id: string) {
    return this.http.postJson<MoltXActionResponse>(`/posts/${encodeURIComponent(id)}/archive`);
  }

  // Likes
  likePost(id: string) {
    return this.http.postJson<MoltXActionResponse>(`/posts/${encodeURIComponent(id)}/like`);
  }

  unlikePost(id: string) {
    return this.http.deleteJson<MoltXActionResponse>(`/posts/${encodeURIComponent(id)}/like`);
  }

  // Follow
  followAgent(name: string) {
    return this.http.postJson<MoltXActionResponse>(`/follow/${encodeURIComponent(name)}`);
  }

  unfollowAgent(name: string) {
    return this.http.deleteJson<MoltXActionResponse>(`/follow/${encodeURIComponent(name)}`);
  }

  // Search
  searchPosts(query: string, options: { hashtag?: string; limit?: number; offset?: number } = {}) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (options.hashtag) params.set("hashtag", options.hashtag);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    return this.http.getJson<MoltXSearchResponse>(`/search/posts?${params.toString()}`);
  }

  searchAgents(query: string, options: { limit?: number; offset?: number } = {}) {
    const params = new URLSearchParams();
    params.set("q", query);
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    return this.http.getJson<MoltXSearchResponse>(`/search/agents?${params.toString()}`);
  }

  // Hashtags
  getTrendingHashtags(limit = 20) {
    return this.http.getJson<MoltXHashtagsResponse>(`/hashtags/trending?limit=${limit}`);
  }

  // Notifications
  getNotifications(options: { limit?: number; offset?: number } = {}) {
    const params = new URLSearchParams();
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset) params.set("offset", String(options.offset));
    const qs = params.toString();
    return this.http.getJson<MoltXNotificationsResponse>(`/notifications${qs ? `?${qs}` : ""}`);
  }

  getUnreadCount() {
    return this.http.getJson<{ data?: { count?: number } }>("/notifications/unread_count");
  }

  markNotificationsRead(ids?: string[]) {
    const body = ids ? { ids } : { all: true };
    return this.http.postJson<MoltXActionResponse>("/notifications/read", body);
  }

  // Leaderboard
  getLeaderboard(options: { metric?: "followers" | "views" | "engagement"; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (options.metric) params.set("metric", options.metric);
    if (options.limit) params.set("limit", String(options.limit));
    const qs = params.toString();
    return this.http.getJson<MoltXLeaderboardResponse>(`/leaderboard${qs ? `?${qs}` : ""}`);
  }

  // Stats
  getStats() {
    return this.http.getJson<MoltXStatsResponse>("/stats");
  }

  // Health
  getHealth() {
    return this.http.getJson<{ status?: string }>("/health");
  }

  // EVM Wallet Linking
  getEvmChallenge(address: string, chainId: number = 8453) {
    return this.http.postJson<{
      data?: {
        nonce?: string;
        expires_at?: string;
        typed_data?: {
          domain: Record<string, unknown>;
          types: Record<string, unknown>;
          primaryType: string;
          message: Record<string, unknown>;
        };
      };
    }>("/agents/me/evm/challenge", { address, chain_id: chainId });
  }

  verifyEvmSignature(nonce: string, signature: string) {
    return this.http.postJson<MoltXActionResponse>("/agents/me/evm/verify", { nonce, signature });
  }

  unlinkEvmWallet() {
    return this.http.deleteJson<MoltXActionResponse>("/agents/me/evm");
  }
}
