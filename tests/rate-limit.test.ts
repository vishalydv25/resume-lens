import { test } from "node:test";
import assert from "node:assert/strict";
import { enforceRateLimit } from "../src/lib/rate-limit.ts";
import { HttpError } from "../src/lib/security.ts";
test("distributed limits allow, deny, and fail closed", async () => {
  const env = {...process.env}; const original = globalThis.fetch;
  Object.assign(process.env, {NODE_ENV:"production", UPSTASH_REDIS_REST_URL:"https://redis.example.test", UPSTASH_REDIS_REST_TOKEN:"test-only"});
  try {
    globalThis.fetch = async (_url, init) => {
      const command = JSON.parse(String(init?.body)); assert.equal(command[0], "EVAL"); assert.equal(command[2], "2");
      return Response.json({result:0});
    };
    await enforceRateLimit();
    globalThis.fetch = async () => Response.json({result:60});
    await assert.rejects(enforceRateLimit(), (e: unknown) => e instanceof HttpError && e.status === 429 && e.retryAfter === 60);
    globalThis.fetch = async () => {throw new Error("offline")};
    await assert.rejects(enforceRateLimit(), (e: unknown) => e instanceof HttpError && e.status === 503);
    delete process.env.UPSTASH_REDIS_REST_URL;
    await assert.rejects(enforceRateLimit(), (e: unknown) => e instanceof HttpError && e.status === 503);
  } finally {
    globalThis.fetch = original;
    for (const key of Object.keys(process.env)) if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  }
});
