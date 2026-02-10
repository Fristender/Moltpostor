export type MoltbookId = string;

export type ApiKey = string;

export type FeedSort = "hot" | "new" | "top";

export type SubmoltName = string;

export type AgentName = string;

// Moltbook API types
export interface MoltbookAgent {
  name: string;
  display_name?: string;
  displayName?: string;
  description?: string;
  karma?: number;
  follower_count?: number;
  followerCount?: number;
  following_count?: number;
  followingCount?: number;
  created_at?: string;
  createdAt?: string;
  api_key?: string;
  claim_url?: string;
  verification_code?: string;
  is_following?: boolean;
}

export interface MoltbookSubmolt {
  name: string;
  display_name?: string;
  displayName?: string;
  description?: string;
  is_subscribed?: boolean;
}

export interface MoltbookPost {
  id: string;
  post_id?: string;
  title?: string;
  content?: string;
  url?: string;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  created_at?: string;
  createdAt?: string;
  author?: MoltbookAgent | string;
  authorName?: string;
  submolt?: MoltbookSubmolt | string;
  submoltName?: string;
}

export interface MoltbookComment {
  id: string;
  content?: string;
  body?: string;
  upvotes?: number;
  downvotes?: number;
  created_at?: string;
  createdAt?: string;
  author?: MoltbookAgent | string;
  authorName?: string;
  post_id?: string;
  postId?: string;
  post?: MoltbookPost;
  post_title?: string;
  postTitle?: string;
  parent_id?: string;
  type?: string;
}

export interface MoltbookSearchResult {
  type: "post" | "comment" | "agent" | "submolt";
  [key: string]: unknown;
}

export interface MoltbookSearchResponse {
  posts?: MoltbookPost[];
  agents?: MoltbookAgent[];
  submolts?: MoltbookSubmolt[];
  comments?: MoltbookComment[];
  results?: MoltbookSearchResult[];
}

export interface MoltbookFeedResponse {
  posts?: MoltbookPost[];
}

export interface MoltbookSubmoltsResponse {
  submolts?: MoltbookSubmolt[];
}

export interface MoltbookPostResponse {
  post?: MoltbookPost;
}

export interface MoltbookCommentsResponse {
  comments?: MoltbookComment[];
}

export interface MoltbookAgentResponse {
  agent?: MoltbookAgent;
  profile?: MoltbookAgent;
  recentPosts?: MoltbookPost[];
  posts?: MoltbookPost[];
  recentComments?: MoltbookComment[];
  comments?: MoltbookComment[];
  is_following?: boolean;
}

export interface MoltbookSubmoltResponse {
  submolt?: MoltbookSubmolt;
  is_subscribed?: boolean;
}

export interface MoltbookRegisterResponse {
  agent?: MoltbookAgent;
  api_key?: string;
  claim_url?: string;
  verification_code?: string;
}

export interface MoltbookActionResponse {
  action?: string;
  success?: boolean;
}

// MoltX API types
export interface MoltXAgent {
  id?: string;
  name: string;
  display_name?: string;
  description?: string;
  avatar_emoji?: string;
  avatar_url?: string;
  banner_url?: string;
  owner_handle?: string;
  owner_x_handle?: string;
  owner_x_avatar_url?: string;
  claim_status?: "pending" | "claimed" | "unclaimed";
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  like_count?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
  evm_address?: string;
}

export interface MoltXPost {
  id: string;
  type: "post" | "reply" | "quote" | "repost";
  content?: string;
  media_url?: string;
  author?: MoltXAgent;
  // Flat author fields from API
  author_id?: string;
  author_name?: string;
  author_display_name?: string;
  author_description?: string;
  author_avatar_emoji?: string;
  author_avatar_url?: string;
  author_claim_status?: string;
  parent_id?: string;
  parent?: MoltXPost;
  quoted_post?: MoltXPost;
  like_count?: number;
  reply_count?: number;
  repost_count?: number;
  quote_count?: number;
  impression_count?: number;
  hashtags?: string[] | string;
  mentions?: string[];
  created_at?: string;
  liked_by_me?: boolean;
}

export interface MoltXArticle {
  id: string;
  type: "article";
  title: string;
  content: string;
  excerpt?: string;
  media_url?: string;
  author: MoltXAgent;
  word_count?: number;
  read_time?: number;
  like_count?: number;
  reply_count?: number;
  impression_count?: number;
  hashtags?: string[];
  created_at?: string;
}

export interface MoltXNotification {
  id: string;
  type: "follow" | "like" | "reply" | "repost" | "quote" | "mention";
  actor: MoltXAgent;
  post?: MoltXPost;
  read?: boolean;
  created_at?: string;
}

export interface MoltXHashtag {
  tag: string;
  post_count: number;
  trend_score?: number;
}

export interface MoltXCommunity {
  id: string;
  name: string;
  description?: string;
  member_count?: number;
  created_at?: string;
}

export interface MoltXFeedResponse {
  data?: MoltXPost[];
  posts?: MoltXPost[];
}

export interface MoltXPostResponse {
  data?: MoltXPost;
  post?: MoltXPost;
  replies?: MoltXPost[];
}

export interface MoltXAgentResponse {
  data?: MoltXAgent;
  agent?: MoltXAgent;
}

export interface MoltXRegisterResponse {
  data?: {
    agent?: MoltXAgent;
    api_key?: string;
    claim?: {
      code?: string;
      expires_at?: string;
    };
  };
  agent?: MoltXAgent;
  api_key?: string;
}

export interface MoltXNotificationsResponse {
  data?: MoltXNotification[];
  notifications?: MoltXNotification[];
}

export interface MoltXLeaderboardResponse {
  data?: MoltXAgent[];
  agents?: MoltXAgent[];
}

export interface MoltXSearchResponse {
  data?: {
    posts?: MoltXPost[];
    agents?: MoltXAgent[];
  };
}

export interface MoltXHashtagsResponse {
  data?: MoltXHashtag[];
  hashtags?: MoltXHashtag[];
}

export interface MoltXStatsResponse {
  data?: {
    total_agents?: number;
    total_posts?: number;
    total_likes?: number;
    total_follows?: number;
  };
}

export interface MoltXActionResponse {
  success?: boolean;
  data?: unknown;
}

// Clawstr (Nostr-based) types
export interface ClawstrIdentity {
  publicKey: string; // hex
  npub: string;
  nsec?: string; // only stored locally, never transmitted
}

export interface ClawstrAuthor {
  pubkey: string; // hex
  npub?: string | undefined;
  name?: string | undefined;
  display_name?: string | undefined;
  about?: string | undefined;
  picture?: string | undefined;
  nip05?: string | undefined;
}

export interface ClawstrPost {
  id: string; // event id (hex)
  noteId: string; // note1... encoded
  content: string;
  author: ClawstrAuthor;
  subclaw?: string | undefined; // e.g., "ai-freedom"
  subclawUrl?: string | undefined; // e.g., "https://clawstr.com/c/ai-freedom"
  created_at: number; // unix timestamp
  tags: string[][];
  isReply?: boolean | undefined;
  parentId?: string | undefined;
  replyCount?: number | undefined;
  upvotes?: number | undefined;
  downvotes?: number | undefined;
}

export interface ClawstrSubclaw {
  name: string;
  url: string;
  description?: string;
  postCount?: number;
}

export interface ClawstrNotification {
  id: string;
  type: "mention" | "reply" | "reaction" | "zap";
  event: ClawstrPost;
  actor?: ClawstrAuthor | undefined;
  amount?: number | undefined; // for zaps
  created_at: number;
}

export interface ClawstrFeedResponse {
  posts: ClawstrPost[];
}

export interface ClawstrPostResponse {
  post: ClawstrPost | null;
  replies: ClawstrPost[];
}

export interface ClawstrProfileResponse {
  author: ClawstrAuthor | null;
  posts: ClawstrPost[];
}

export interface ClawstrNotificationsResponse {
  notifications: ClawstrNotification[];
}

export interface ClawstrSearchResponse {
  posts: ClawstrPost[];
}
