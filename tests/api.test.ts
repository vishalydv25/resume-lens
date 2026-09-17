import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../src/app/api/analyse/route.ts";
import { SAMPLE_ANALYSIS, SAMPLE_JOB, SAMPLE_RESUME } from "../src/lib/sample.ts";
const request = (body: unknown, origin = "http://localhost:3000") => new Request("http://localhost:3000/api/analyse", {
  method:"POST", headers:{"Content-Type":"application/json", origin, host:"localhost:3000"}, body:JSON.stringify(body)
});
test("demo endpoint works with no secrets and never calls a provider", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Demo must not use fetch"); };
  try {
    const response = await POST(request({mode:"demo"}));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const data = await response.json(); assert.equal(data.mode, "demo"); assert.equal(data.score, 73);
  } finally { globalThis.fetch = originalFetch; }
});
test("cross-origin and invalid payloads are rejected", async () => {
  assert.equal((await POST(request({mode:"demo"}, "https://untrusted.test"))).status, 403);
  assert.equal((await POST(request({mode:"invalid"}))).status, 400);
});
test("live endpoint validates access and handles a mocked provider response", async () => {
  const oldEnv = {...process.env}; const originalFetch = globalThis.fetch;
  Object.assign(process.env, {NODE_ENV:"development", GROQ_API_KEY:"not-a-real-key", APP_ACCESS_CODE:"test-only-access-code-12345", GROQ_MODEL:"openai/gpt-oss-120b", LIVE_REQUESTS_PER_MINUTE:"100", LIVE_REQUESTS_PER_DAY:"100"});
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const body = {mode:"live", resume:SAMPLE_RESUME, job:SAMPLE_JOB, consent:true, accessCode:process.env.APP_ACCESS_CODE};
  let calls = 0;
  globalThis.fetch = async (_input, init) => {
    calls++;
    const payload = JSON.parse(String(init?.body));
    assert.equal(String(_input), "https://api.groq.com/openai/v1/chat/completions");
    assert.equal(payload.response_format.type, "json_schema");
    assert.equal(payload.response_format.json_schema.strict, true);
    assert.equal(payload.max_completion_tokens, 3000);
    assert.equal(payload.include_reasoning, false);
    assert.equal(payload.messages[0].role, "system");
    assert.equal(JSON.parse(payload.messages[1].content).resume, SAMPLE_RESUME);
    assert.equal(payload.store, undefined);
    assert.equal(payload.text, undefined);
    return Response.json({choices:[{finish_reason:"stop", message:{content:JSON.stringify(SAMPLE_ANALYSIS)}}]});
  };
  try {
    assert.equal((await POST(request({...body, accessCode:"wrong-but-long-enough"}))).status, 401);
    assert.equal(calls, 0);
    const response = await POST(request(body));
    assert.equal(response.status, 200); assert.equal((await response.json()).mode, "live"); assert.equal(calls, 1);
    globalThis.fetch = async () => Response.json({choices:[{finish_reason:"length",message:{content:"{}"}}]});
    assert.equal((await POST(request(body))).status, 502);
    globalThis.fetch = async () => Response.json({error:{message:"private provider error"}}, {status:500});
    const errorResponse = await POST(request(body));
    assert.equal(errorResponse.status, 502);
    assert.equal((await errorResponse.text()).includes("private provider error"), false);
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in oldEnv)) delete process.env[key];
    Object.assign(process.env, oldEnv);
  }
});
