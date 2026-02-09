import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from "nostr-tools/pure";
import { npubEncode, nsecEncode, decode, noteEncode } from "nostr-tools/nip19";
import { hexToBytes } from "nostr-tools/utils";
import type {
  ClawstrIdentity,
  ClawstrAuthor,
  ClawstrPost,
  ClawstrFeedResponse,
  ClawstrPostResponse,
  ClawstrProfileResponse,
  ClawstrNotification,
  ClawstrNotificationsResponse,
  ClawstrSearchResponse,
} from "@moltpostor/core";

export const DEFAULT_CLAWSTR_RELAYS = [
  "wss://relay.ditto.pub",
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nos.lol",
];

const CLAWSTR_BASE_URL = "https://clawstr.com";

type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
};

type NostrFilter = {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  "#e"?: string[];
  "#p"?: string[];
  "#I"?: string[];
  "#i"?: string[];
  "#k"?: string[];
  "#l"?: string[];
  "#L"?: string[];
  since?: number;
  until?: number;
  limit?: number;
  search?: string;
};

function encodeNote(eventId: string): string {
  try {
    return noteEncode(eventId);
  } catch {
    return `note1${eventId.slice(0, 50)}`;
  }
}

function decodeEventRef(ref: string): string {
  if (ref.startsWith("note1") || ref.startsWith("nevent1")) {
    try {
      const decoded = decode(ref);
      if (decoded.type === "note") return decoded.data as string;
      if (decoded.type === "nevent") return (decoded.data as { id: string }).id;
    } catch {
      return ref;
    }
  }
  if (/^[0-9a-f]{64}$/i.test(ref)) return ref.toLowerCase();
  return ref;
}

function eventToPost(event: NostrEvent, authorMeta?: Map<string, ClawstrAuthor>): ClawstrPost {
  const iTag = event.tags.find((t) => t[0] === "I" && t[1]?.includes("clawstr.com/c/"));
  const subclaw = iTag?.[1]?.replace(`${CLAWSTR_BASE_URL}/c/`, "") ?? undefined;
  const isReply = event.tags.some((t) => t[0] === "e");
  const parentTag = event.tags.find((t) => t[0] === "e");

  const authorInfo = authorMeta?.get(event.pubkey);

  return {
    id: event.id,
    noteId: encodeNote(event.id),
    content: event.content,
    author: authorInfo ?? {
      pubkey: event.pubkey,
      npub: npubEncode(event.pubkey),
    },
    subclaw,
    subclawUrl: subclaw ? `${CLAWSTR_BASE_URL}/c/${subclaw}` : undefined,
    created_at: event.created_at,
    tags: event.tags,
    isReply,
    parentId: parentTag?.[1],
    kind: event.kind,
    sig: event.sig,
  };
}

export class ClawstrApi {
  private relays: string[];
  private secretKey: Uint8Array | null = null;
  private publicKey: string | null = null;

  constructor(options?: { relays?: string[]; secretKey?: string }) {
    this.relays = options?.relays ?? DEFAULT_CLAWSTR_RELAYS;
    if (options?.secretKey) {
      this.importSecretKey(options.secretKey);
    }
  }

  generateIdentity(): ClawstrIdentity {
    const secretKey = generateSecretKey();
    const publicKey = getPublicKey(secretKey);
    this.secretKey = secretKey;
    this.publicKey = publicKey;
    return {
      publicKey,
      npub: npubEncode(publicKey),
      nsec: nsecEncode(secretKey),
    };
  }

  importSecretKey(nsecOrHex: string): ClawstrIdentity {
    let secretKey: Uint8Array;
    if (nsecOrHex.startsWith("nsec1")) {
      const decoded = decode(nsecOrHex);
      if (decoded.type !== "nsec") throw new Error("Invalid nsec");
      secretKey = decoded.data as Uint8Array;
    } else if (/^[0-9a-f]{64}$/i.test(nsecOrHex)) {
      secretKey = hexToBytes(nsecOrHex);
    } else {
      throw new Error("Invalid secret key format");
    }
    const publicKey = getPublicKey(secretKey);
    this.secretKey = secretKey;
    this.publicKey = publicKey;
    return {
      publicKey,
      npub: npubEncode(publicKey),
      nsec: nsecEncode(secretKey),
    };
  }

  getIdentity(): ClawstrIdentity | null {
    if (!this.secretKey || !this.publicKey) return null;
    return {
      publicKey: this.publicKey,
      npub: npubEncode(this.publicKey),
      nsec: nsecEncode(this.secretKey),
    };
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  isAuthenticated(): boolean {
    return this.secretKey !== null && this.publicKey !== null;
  }

  private async queryRelays(filter: NostrFilter, timeout = 5000): Promise<NostrEvent[]> {
    const events: NostrEvent[] = [];
    const seenIds = new Set<string>();

    const queryRelay = async (relayUrl: string): Promise<NostrEvent[]> => {
      return new Promise((resolve) => {
        const relayEvents: NostrEvent[] = [];
        let ws: WebSocket | null = null;
        const subId = Math.random().toString(36).slice(2, 10);

        const timer = setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) ws.close();
          resolve(relayEvents);
        }, timeout);

        try {
          ws = new WebSocket(relayUrl);
          
          ws.onopen = () => {
            const req = JSON.stringify(["REQ", subId, filter]);
            ws?.send(req);
          };
          
          ws.onmessage = (msg) => {
            try {
              const data = JSON.parse(typeof msg.data === "string" ? msg.data : msg.data.toString());
              if (data[0] === "EVENT" && data[1] === subId && data[2]) {
                const event = data[2] as NostrEvent;
                if (verifyEvent(event)) {
                  relayEvents.push(event);
                }
              } else if (data[0] === "EOSE" && data[1] === subId) {
                clearTimeout(timer);
                if (ws && ws.readyState === WebSocket.OPEN) ws.close();
                resolve(relayEvents);
              }
            } catch { /* ignore parse errors */ }
          };
          
          ws.onerror = () => {
            clearTimeout(timer);
            resolve(relayEvents);
          };
          
          ws.onclose = () => {
            clearTimeout(timer);
            resolve(relayEvents);
          };
        } catch {
          clearTimeout(timer);
          resolve(relayEvents);
        }
      });
    };

    const results = await Promise.all(this.relays.map(queryRelay));
    for (const relayEvents of results) {
      for (const event of relayEvents) {
        if (!seenIds.has(event.id)) {
          seenIds.add(event.id);
          events.push(event);
        }
      }
    }

    return events.sort((a, b) => b.created_at - a.created_at);
  }

  private async publishEvent(event: NostrEvent): Promise<string[]> {
    const published: string[] = [];

    const publishToRelay = async (relayUrl: string): Promise<boolean> => {
      return new Promise((resolve) => {
        let ws: WebSocket | null = null;
        const timer = setTimeout(() => {
          if (ws) ws.close();
          resolve(false);
        }, 5000);

        try {
          ws = new WebSocket(relayUrl);
          ws.onopen = () => {
            ws?.send(JSON.stringify(["EVENT", event]));
          };
          ws.onmessage = (msg) => {
            try {
              const data = JSON.parse(msg.data);
              if (data[0] === "OK" && data[1] === event.id) {
                clearTimeout(timer);
                ws?.close();
                resolve(data[2] === true);
              }
            } catch { /* ignore */ }
          };
          ws.onerror = () => {
            clearTimeout(timer);
            resolve(false);
          };
        } catch {
          clearTimeout(timer);
          resolve(false);
        }
      });
    };

    const results = await Promise.all(
      this.relays.map(async (relay) => {
        const success = await publishToRelay(relay);
        return { relay, success };
      })
    );

    for (const { relay, success } of results) {
      if (success) published.push(relay);
    }

    return published;
  }

  private createSignedEvent(kind: number, content: string, tags: string[][]): NostrEvent {
    if (!this.secretKey) throw new Error("No secret key - authenticate first");

    const eventTemplate = {
      kind,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    };

    return finalizeEvent(eventTemplate, this.secretKey) as NostrEvent;
  }

  private async fetchAuthorMetadata(pubkeys: string[]): Promise<Map<string, ClawstrAuthor>> {
    const authors = new Map<string, ClawstrAuthor>();
    if (pubkeys.length === 0) return authors;

    const uniquePubkeys = [...new Set(pubkeys)];
    const events = await this.queryRelays({
      kinds: [0],
      authors: uniquePubkeys,
      limit: uniquePubkeys.length,
    }, 8000); // Longer timeout for metadata

    for (const event of events) {
      if (authors.has(event.pubkey)) continue;
      try {
        const meta = JSON.parse(event.content);
        authors.set(event.pubkey, {
          pubkey: event.pubkey,
          npub: npubEncode(event.pubkey),
          name: meta.name,
          display_name: meta.display_name,
          about: meta.about,
          picture: meta.picture,
          nip05: meta.nip05,
        });
      } catch { /* ignore parse errors */ }
    }

    return authors;
  }

  async getSubclawFeed(subclaw: string, options?: { limit?: number; aiOnly?: boolean }): Promise<ClawstrFeedResponse> {
    const limit = options?.limit ?? 30;
    const normalizedSubclaw = subclaw.replace(/^\/c\//, "").replace(`${CLAWSTR_BASE_URL}/c/`, "");
    const subclawUrl = `${CLAWSTR_BASE_URL}/c/${normalizedSubclaw}`;

    // Query kind 1111 with the subclaw URL in I tag
    const filter: NostrFilter = {
      kinds: [1111],
      "#I": [subclawUrl],
      limit: limit * 2,
    };

    let events = await this.queryRelays(filter, 8000);

    // Filter for AI-only posts if requested
    if (options?.aiOnly !== false) {
      events = events.filter((e) =>
        e.tags.some((t) => t[0] === "l" && t[1] === "ai")
      );
    }

    events = events.slice(0, limit);

    const authorMeta = await this.fetchAuthorMetadata(events.map((e) => e.pubkey));
    const posts = events.map((e) => eventToPost(e, authorMeta));

    return { posts };
  }

  async getRecentFeed(options?: { limit?: number; aiOnly?: boolean }): Promise<ClawstrFeedResponse> {
    const limit = options?.limit ?? 30;

    // Query kind 1111 (NIP-22 comments) with web tag
    // Note: Not all relays support #l/#L tag filtering, so we filter client-side for AI posts
    const filter: NostrFilter = {
      kinds: [1111],
      limit: limit * 2, // Fetch more to account for client-side filtering
    };

    const events = await this.queryRelays(filter, 8000); // Longer timeout for initial load
    
    // Filter for Clawstr posts (have I tag with clawstr.com/c/)
    let clawstrEvents = events.filter((e) =>
      e.tags.some((t) => t[0] === "I" && t[1]?.includes("clawstr.com/c/"))
    );

    // Filter for AI-only posts if requested (have l=ai tag)
    if (options?.aiOnly !== false) {
      clawstrEvents = clawstrEvents.filter((e) =>
        e.tags.some((t) => t[0] === "l" && t[1] === "ai")
      );
    }

    // Limit results
    clawstrEvents = clawstrEvents.slice(0, limit);

    const authorMeta = await this.fetchAuthorMetadata(clawstrEvents.map((e) => e.pubkey));
    const posts = clawstrEvents.map((e) => eventToPost(e, authorMeta));

    return { posts };
  }

  async getPost(eventRef: string): Promise<ClawstrPostResponse> {
    const eventId = decodeEventRef(eventRef);

    const [postEvents, replyEvents] = await Promise.all([
      this.queryRelays({ ids: [eventId] }),
      this.queryRelays({ kinds: [1111], "#e": [eventId], limit: 50 }),
    ]);

    const allPubkeys = [
      ...postEvents.map((e) => e.pubkey),
      ...replyEvents.map((e) => e.pubkey),
    ];
    const authorMeta = await this.fetchAuthorMetadata(allPubkeys);

    const post = postEvents[0] ? eventToPost(postEvents[0], authorMeta) : null;
    const replies = replyEvents
      .sort((a, b) => a.created_at - b.created_at)
      .map((e) => eventToPost(e, authorMeta));

    return { post, replies };
  }

  async getProfile(npubOrPubkey: string): Promise<ClawstrProfileResponse> {
    let pubkey: string;
    if (npubOrPubkey.startsWith("npub1")) {
      const decoded = decode(npubOrPubkey);
      if (decoded.type !== "npub") throw new Error("Invalid npub");
      pubkey = decoded.data as string;
    } else {
      pubkey = npubOrPubkey;
    }

    const [metaEvents, postEvents] = await Promise.all([
      this.queryRelays({ kinds: [0], authors: [pubkey], limit: 1 }, 8000),
      this.queryRelays({
        kinds: [1111],
        authors: [pubkey],
        limit: 30,
      }, 8000),
    ]);

    let author: ClawstrAuthor | null = null;
    if (metaEvents[0]) {
      try {
        const meta = JSON.parse(metaEvents[0].content);
        author = {
          pubkey,
          npub: npubEncode(pubkey),
          name: meta.name,
          display_name: meta.display_name,
          about: meta.about,
          picture: meta.picture,
          nip05: meta.nip05,
        };
      } catch { /* ignore */ }
    }

    if (!author) {
      author = { pubkey, npub: npubEncode(pubkey) };
    }

    const authorMeta = new Map<string, ClawstrAuthor>();
    authorMeta.set(pubkey, author);

    const clawstrPosts = postEvents.filter((e) =>
      e.tags.some((t) => t[0] === "I" && t[1]?.includes("clawstr.com/c/"))
    );
    const posts = clawstrPosts.map((e) => eventToPost(e, authorMeta));

    return { author, posts };
  }

  async createPost(subclaw: string, content: string): Promise<ClawstrPost> {
    const normalizedSubclaw = subclaw.replace(/^\/c\//, "").replace(`${CLAWSTR_BASE_URL}/c/`, "");
    const subclawUrl = `${CLAWSTR_BASE_URL}/c/${normalizedSubclaw}`;

    const tags: string[][] = [
      ["I", subclawUrl],
      ["K", "web"],
      ["i", subclawUrl],
      ["k", "web"],
      ["L", "agent"],
      ["l", "ai", "agent"],
      ["client", "moltpostor"],
    ];

    const event = this.createSignedEvent(1111, content, tags);
    const published = await this.publishEvent(event);

    if (published.length === 0) {
      throw new Error("Failed to publish to any relay");
    }

    return eventToPost(event);
  }

  async createReply(parentEventRef: string, content: string): Promise<ClawstrPost> {
    const parentId = decodeEventRef(parentEventRef);
    const parentEvents = await this.queryRelays({ ids: [parentId] });
    const parent = parentEvents[0];

    if (!parent) throw new Error("Parent event not found");

    const rootTag = parent.tags.find((t) => t[0] === "e" && t[3] === "root");
    const rootId = rootTag?.[1] ?? parentId;

    const iTag = parent.tags.find((t) => t[0] === "I");
    const kTag = parent.tags.find((t) => t[0] === "K");

    const tags: string[][] = [
      ["e", rootId, "", "root"],
      ["e", parentId, "", "reply"],
      ["p", parent.pubkey],
    ];

    if (iTag && iTag[1]) tags.push(["I", iTag[1]]);
    if (kTag && kTag[1]) tags.push(["K", kTag[1]]);
    tags.push(["i", `nostr:${parentId}`]);
    tags.push(["k", "nostr"]);
    tags.push(["L", "agent"]);
    tags.push(["l", "ai", "agent"]);
    tags.push(["client", "moltpostor"]);

    const event = this.createSignedEvent(1111, content, tags);
    const published = await this.publishEvent(event);

    if (published.length === 0) {
      throw new Error("Failed to publish to any relay");
    }

    return eventToPost(event);
  }

  async upvote(eventRef: string): Promise<void> {
    const eventId = decodeEventRef(eventRef);
    const events = await this.queryRelays({ ids: [eventId] });
    const target = events[0];

    if (!target) throw new Error("Event not found");

    const tags: string[][] = [
      ["e", eventId],
      ["p", target.pubkey],
    ];

    const event = this.createSignedEvent(7, "+", tags);
    const published = await this.publishEvent(event);

    if (published.length === 0) {
      throw new Error("Failed to publish reaction");
    }
  }

  async downvote(eventRef: string): Promise<void> {
    const eventId = decodeEventRef(eventRef);
    const events = await this.queryRelays({ ids: [eventId] });
    const target = events[0];

    if (!target) throw new Error("Event not found");

    const tags: string[][] = [
      ["e", eventId],
      ["p", target.pubkey],
    ];

    const event = this.createSignedEvent(7, "-", tags);
    const published = await this.publishEvent(event);

    if (published.length === 0) {
      throw new Error("Failed to publish reaction");
    }
  }

  async getNotifications(options?: { limit?: number }): Promise<ClawstrNotificationsResponse> {
    if (!this.publicKey) throw new Error("Not authenticated");

    const limit = options?.limit ?? 30;
    const events = await this.queryRelays({
      kinds: [1111, 7, 9735],
      "#p": [this.publicKey],
      limit,
    });

    const authorMeta = await this.fetchAuthorMetadata(events.map((e) => e.pubkey));
    const notifications: ClawstrNotification[] = events.map((e) => {
      let type: ClawstrNotification["type"] = "mention";
      if (e.kind === 7) type = "reaction";
      else if (e.kind === 9735) type = "zap";
      else if (e.tags.some((t) => t[0] === "e")) type = "reply";

      return {
        id: e.id,
        type,
        event: eventToPost(e, authorMeta),
        actor: authorMeta.get(e.pubkey),
        created_at: e.created_at,
      };
    });

    return { notifications };
  }

  async search(query: string, options?: { limit?: number; aiOnly?: boolean }): Promise<ClawstrSearchResponse> {
    const limit = options?.limit ?? 30;

    const filter: NostrFilter = {
      kinds: [1111],
      "#k": ["web"],
      search: query,
      limit,
    };

    if (options?.aiOnly !== false) {
      filter["#l"] = ["ai"];
      filter["#L"] = ["agent"];
    }

    const events = await this.queryRelays(filter);
    const clawstrEvents = events.filter((e) =>
      e.tags.some((t) => t[0] === "I" && t[1]?.includes("clawstr.com/c/"))
    );
    const authorMeta = await this.fetchAuthorMetadata(clawstrEvents.map((e) => e.pubkey));
    const posts = clawstrEvents.map((e) => eventToPost(e, authorMeta));

    return { posts };
  }

  async updateProfile(profile: { name?: string; display_name?: string; about?: string; picture?: string }): Promise<void> {
    if (!this.publicKey) throw new Error("Not authenticated");

    const existingMeta = await this.queryRelays({
      kinds: [0],
      authors: [this.publicKey],
      limit: 1,
    });

    let meta: Record<string, string> = {};
    if (existingMeta[0]) {
      try {
        meta = JSON.parse(existingMeta[0].content);
      } catch { /* ignore */ }
    }

    if (profile.name !== undefined) meta.name = profile.name;
    if (profile.display_name !== undefined) meta.display_name = profile.display_name;
    if (profile.about !== undefined) meta.about = profile.about;
    if (profile.picture !== undefined) meta.picture = profile.picture;

    const event = this.createSignedEvent(0, JSON.stringify(meta), []);
    const published = await this.publishEvent(event);

    if (published.length === 0) {
      throw new Error("Failed to publish profile update");
    }
  }
}
