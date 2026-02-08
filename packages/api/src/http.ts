import type { ApiKey } from "@moltpostor/core";

export type HttpClientOptions = {
  baseUrl: string;
  getApiKey?: () => ApiKey | null;
  timeoutMs?: number;
};

export class HttpError extends Error {
  readonly status: number;
  readonly bodyText: string;

  constructor(message: string, status: number, bodyText: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.bodyText = bodyText;
  }
}

export class MoltbookHttpClient {
  readonly baseUrl: string;
  private readonly getApiKey: (() => ApiKey | null) | undefined;
  private readonly timeoutMs: number;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.getApiKey = opts.getApiKey;
    // Be conservative: Moltbook endpoints (notably search) can be slow under load.
    // Also ensure we surface a useful error message (not a generic abort string).
    this.timeoutMs = opts.timeoutMs ?? 45_000;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const url = `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    const apiKey = this.getApiKey?.() ?? null;
    if (apiKey) headers.set("Authorization", `Bearer ${apiKey}`);

    const controller = new AbortController();
    let timedOut = false;
    const timeoutErr = new Error(`Request timed out after ${this.timeoutMs}ms`);
    const timer = setTimeout(() => {
      timedOut = true;
      // When supported, the abort reason becomes the fetch rejection reason.
      controller.abort(timeoutErr);
    }, this.timeoutMs);
    try {
      return await fetch(url, { ...init, headers, signal: controller.signal });
    } catch (e: unknown) {
      // Some browsers ignore the abort reason and produce an unhelpful error message.
      if (timedOut) throw timeoutErr;
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  async getJson<T>(path: string): Promise<T> {
    const res = await this.request(path, { method: "GET" });
    if (!res.ok) throw await this.toError("GET", path, res);
    return (await res.json()) as T;
  }

  async postJson<T>(path: string, body?: unknown): Promise<T> {
    const headers = new Headers({ "Content-Type": "application/json" });
    const payload = body === undefined ? null : JSON.stringify(body);
    const res = await this.request(path, {
      method: "POST",
      headers,
      body: payload,
    });
    if (!res.ok) throw await this.toError("POST", path, res);
    return (await res.json()) as T;
  }

  async patchJson<T>(path: string, body?: unknown): Promise<T> {
    const headers = new Headers({ "Content-Type": "application/json" });
    const payload = body === undefined ? null : JSON.stringify(body);
    const res = await this.request(path, {
      method: "PATCH",
      headers,
      body: payload,
    });
    if (!res.ok) throw await this.toError("PATCH", path, res);
    return (await res.json()) as T;
  }

  async deleteJson<T>(path: string): Promise<T> {
    const res = await this.request(path, { method: "DELETE" });
    if (!res.ok) throw await this.toError("DELETE", path, res);
    return (await res.json()) as T;
  }

  private async toError(method: string, path: string, res: Response): Promise<HttpError> {
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      bodyText = "";
    }
    return new HttpError(`${method} ${path} failed (${res.status})`, res.status, bodyText);
  }
}
