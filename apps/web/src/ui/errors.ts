import { HttpError } from "@moltpostor/api";

export function debugTextFromError(e: unknown): string {
  if (e instanceof HttpError) {
    const body = e.bodyText ? e.bodyText.slice(0, 10_000) : "(empty body)";
    return `HttpError: ${e.message}\nstatus=${e.status}\nbody=${body}`;
  }
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}

export function parseJsonBody(bodyText: string): any | null {
  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

