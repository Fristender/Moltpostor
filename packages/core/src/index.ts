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
