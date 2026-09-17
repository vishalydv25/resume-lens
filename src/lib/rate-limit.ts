import { HttpError } from "./security.ts";
const local = new Map<string, { count: number; expires: number }>();
function limitValue(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n <= 10000 ? n : fallback;
}
// Atomic global fixed-window limits. No IP address or resume content is stored.
// A failed provider call still consumes a request to bound abuse and cost.
const LUA = `
local a = tonumber(redis.call('GET', KEYS[1]) or '0')
local b = tonumber(redis.call('GET', KEYS[2]) or '0')
if a >= tonumber(ARGV[1]) then return 60 end
if b >= tonumber(ARGV[2]) then return 86400 end
local x = redis.call('INCR', KEYS[1])
if x == 1 then redis.call('EXPIRE', KEYS[1], 120) end
local y = redis.call('INCR', KEYS[2])
if y == 1 then redis.call('EXPIRE', KEYS[2], 172800) end
return 0`;
export async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const minute = limitValue(process.env.LIVE_REQUESTS_PER_MINUTE, 1);
  const day = limitValue(process.env.LIVE_REQUESTS_PER_DAY, 50);
  const windows = [
    { key: `resume-lens:minute:${Math.floor(now / 60000)}`, limit: minute, duration: 60000 },
    { key: `resume-lens:day:${Math.floor(now / 86400000)}`, limit: day, duration: 86400000 }
  ];
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      if (new URL(url).protocol !== "https:") throw new Error("HTTPS required");
      const response = await fetch(url.replace(/\/$/, ""), {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", LUA, "2", windows[0].key, windows[1].key, String(minute), String(day)]),
        signal: AbortSignal.timeout(5000), cache: "no-store"
      });
      if (!response.ok) throw new Error("Rate limiter unavailable");
      const data = await response.json();
      if (data.error || typeof data.result !== "number") throw new Error("Invalid rate limit response");
      if (data.result > 0) throw new HttpError(429, "The shared analysis limit has been reached. Please try again later.", data.result);
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(503, "The analysis service is temporarily unavailable. Please try again later.");
    }
    return;
  }
  if (process.env.NODE_ENV === "production") throw new HttpError(503, "Live analysis has not been configured.");
  for (const [key, value] of local) if (value.expires <= now) local.delete(key);
  for (const window of windows) {
    if ((local.get(window.key)?.count ?? 0) >= window.limit) throw new HttpError(429, "Local analysis limit reached. Try again later.", Math.ceil(window.duration / 1000));
  }
  for (const window of windows) {
    const previous = local.get(window.key);
    local.set(window.key, { count: (previous?.count ?? 0) + 1, expires: previous?.expires ?? now + window.duration });
  }
}
