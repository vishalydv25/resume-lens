import { createHash, timingSafeEqual } from "node:crypto";
type Env = Record<string, string | undefined>;
export function isLiveEnabled(env: Env = process.env): boolean {
  return Boolean(env.GROQ_API_KEY?.trim() && (env.APP_ACCESS_CODE?.length ?? 0) >= 16 &&
    (env.NODE_ENV !== "production" || (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN)));
}
export function validAccessCode(input: string, expected: string): boolean {
  if (expected.length < 16) return false;
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(input), hash(expected));
}
export class HttpError extends Error {
  constructor(public status: number, message: string, public retryAfter?: number) { super(message); }
}
export async function readBoundedJson(request: Request, maxBytes = 200000): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new HttpError(413, "Request is too large.");
  if (!request.body) throw new HttpError(400, "Request body is missing.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); }
  catch { throw new HttpError(400, "Send a valid JSON request."); }
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const canonical = process.env.APP_ORIGIN?.replace(/\/$/, "");
  let valid = false;
  try { valid = !!origin && (canonical ? origin === canonical : new URL(origin).host === request.headers.get("host")); }
  catch { valid = false; }
  if (!valid) throw new HttpError(403, "This request must come from the application website.");
}
