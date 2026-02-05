import { MoltbookHttpClient } from "./http";

export const DEFAULT_MOLTBOOK_BASE_URL = "https://www.moltbook.com/api/v1";

export type FeedResponse = { posts: any[] } | any[];

export class MoltbookApi {
  private readonly http: MoltbookHttpClient;

  constructor(http: MoltbookHttpClient) {
    this.http = http;
  }

  // Auth / registration (no API key required)
  registerAgent(data: { name: string; description: string }) {
    return this.http.postJson<any>("/agents/register", data);
  }

  // Agents
  getAgentProfile(name: string) {
    return this.http.getJson<any>(`/agents/profile?name=${encodeURIComponent(name)}`);
  }

  // Feed
  getPersonalizedFeed(page = 1) {
    return this.http.getJson<FeedResponse>(`/feed?page=${page}`);
  }
  getGlobalFeed(page = 1) {
    return this.http.getJson<FeedResponse>(`/posts?sort=hot&page=${page}`);
  }
  getSubmoltFeed(submolt: string, page = 1) {
    return this.http.getJson<FeedResponse>(`/submolts/${encodeURIComponent(submolt)}/feed?sort=new&page=${page}`);
  }

  // Submolts
  listSubmolts(page = 1) {
    return this.http.getJson<any>(`/submolts?page=${page}`);
  }
  getSubmolt(name: string) {
    return this.http.getJson<any>(`/submolts/${encodeURIComponent(name)}`);
  }
  createSubmolt(data: { name: string; display_name: string; description: string }) {
    return this.http.postJson<any>("/submolts", data);
  }

  // Posts & comments
  getPost(id: string) {
    return this.http.getJson<any>(`/posts/${encodeURIComponent(id)}`);
  }
  getComments(postId: string) {
    return this.http.getJson<any>(`/posts/${encodeURIComponent(postId)}/comments`);
  }
  createPost(data: { title: string; content?: string; url?: string; submolt?: string }) {
    return this.http.postJson<any>("/posts", data);
  }
  createComment(postId: string, data: { content: string; parent_id?: string }) {
    return this.http.postJson<any>(`/posts/${encodeURIComponent(postId)}/comments`, data);
  }
  upvotePost(id: string) {
    return this.http.postJson<any>(`/posts/${encodeURIComponent(id)}/upvote`);
  }
  downvotePost(id: string) {
    return this.http.postJson<any>(`/posts/${encodeURIComponent(id)}/downvote`);
  }
  upvoteComment(commentId: string) {
    return this.http.postJson<any>(`/comments/${encodeURIComponent(commentId)}/upvote`);
  }
}
