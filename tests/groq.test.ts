import { test } from "node:test";
import assert from "node:assert/strict";
import { analyseWithAI } from "../src/lib/ai.ts";
import { HttpError, isLiveEnabled } from "../src/lib/security.ts";
import { requestSchema } from "../src/lib/schema.ts";
import { SAMPLE_ANALYSIS, SAMPLE_JOB, SAMPLE_RESUME } from "../src/lib/sample.ts";
import { POST } from "../src/app/api/analyse/route.ts";

async function isolated(run: () => Promise<void>) {
  const original = globalThis.fetch; const env = {...process.env};
  Object.assign(process.env, {GROQ_API_KEY:"fake-key-for-mocked-tests", GROQ_MODEL:"openai/gpt-oss-120b", NODE_ENV:"development", APP_ACCESS_CODE:"test-only-access-code-12345", LIVE_REQUESTS_PER_MINUTE:"100", LIVE_REQUESTS_PER_DAY:"100"});
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; delete process.env.APP_ORIGIN;
  try { await run(); } finally {
    globalThis.fetch = original;
    for (const k of Object.keys(process.env)) if (!(k in env)) delete process.env[k];
    Object.assign(process.env, env);
  }
}
const statusIs = (status: number) => (e: unknown) => e instanceof HttpError && e.status === status;
const completion = (content: string | null, finish_reason = "stop") => Response.json({choices:[{finish_reason,message:{content}}]});

test("legacy credentials alone cannot enable live mode", () => {
  assert.equal(isLiveEnabled({OPENAI_API_KEY:"legacy",APP_ACCESS_CODE:"long-valid-access-code",NODE_ENV:"development"}), false);
});
test("new character caps accept exact boundaries and reject excess", () => {
  const input = {mode:"live",resume:"a".repeat(8000),job:"b".repeat(4000),consent:true,accessCode:"long-valid-access-code"};
  assert.equal(requestSchema.safeParse(input).success,true);
  assert.equal(requestSchema.safeParse({...input,resume:input.resume+"a"}).success,false);
  assert.equal(requestSchema.safeParse({...input,job:input.job+"b"}).success,false);
});
test("default model and alternative model use strict JSON without reasoning output", async () => isolated(async () => {
  delete process.env.GROQ_MODEL;
  let expected = "openai/gpt-oss-120b";
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url),"https://api.groq.com/openai/v1/chat/completions");
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.model,expected); assert.equal(payload.include_reasoning,false);
    assert.equal(payload.reasoning_effort,"low"); assert.equal(payload.stream,false);
    assert.equal(payload.max_completion_tokens,3000);
    assert.equal(new Headers(init?.headers).get("authorization"),"Bearer fake-key-for-mocked-tests");
    assert.equal(payload.response_format.json_schema.strict,true);
    assert.equal(payload.response_format.json_schema.schema.additionalProperties,false);
    return completion(JSON.stringify(SAMPLE_ANALYSIS));
  };
  assert.deepEqual(await analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB),SAMPLE_ANALYSIS);
  expected = "openai/gpt-oss-20b"; process.env.GROQ_MODEL = expected;
  await analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB);
}));
test("missing Groq credentials and unsupported model fail before network", async () => isolated(async () => {
  globalThis.fetch = async () => {throw new Error("Must not call network")};
  delete process.env.GROQ_API_KEY;
  await assert.rejects(analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB),statusIs(503));
  process.env.GROQ_API_KEY="fake";process.env.GROQ_MODEL="unsupported-model";
  await assert.rejects(analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB),statusIs(503));
}));
test("Groq 429 becomes a friendly API response with Retry-After", async () => isolated(async () => {
  globalThis.fetch = async () => Response.json({error:"private upstream detail"},{status:429,headers:{"Retry-After":"17.2"}});
  const request = new Request("http://localhost:3000/api/analyse", {method:"POST",headers:{origin:"http://localhost:3000",host:"localhost:3000","Content-Type":"application/json"},body:JSON.stringify({mode:"live",resume:SAMPLE_RESUME,job:SAMPLE_JOB,consent:true,accessCode:process.env.APP_ACCESS_CODE})});
  const response=await POST(request);
  assert.equal(response.status,429);assert.equal(response.headers.get("Retry-After"),"18");
  assert.equal(response.headers.get("Cache-Control"),"no-store");
  const body=await response.text();assert.ok(body.includes("Groq"));assert.ok(!body.includes("private upstream detail"));
}));
test("provider HTTP errors are sanitized and request size is actionable", async () => isolated(async () => {
  for (const code of [400,401,403,404,413,500]) {
    globalThis.fetch=async()=>Response.json({error:"sensitive detail"},{status:code});
    await assert.rejects(analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB),(e:unknown)=>e instanceof HttpError && e.status === (code===413?413:502) && !e.message.includes("sensitive detail"));
  }
}));
test("refusals, truncation, malformed JSON and empty reports are not accepted", async () => isolated(async () => {
  for (const result of [completion('{}','length'),completion(null),completion('invalid'),Response.json({choices:[]}),Response.json({choices:[{finish_reason:"stop",message:{refusal:"Refused",content:null}}]}),completion('{}','content_filter')]) {
    globalThis.fetch=async()=>result;
    await assert.rejects(analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB),(e:unknown)=>e instanceof HttpError && [422,502].includes(e.status));
  }
}));
test("network failure produces a safe service-unavailable error", async () => isolated(async () => {
  globalThis.fetch=async()=>{throw new Error("private connection detail")};
  await assert.rejects(analyseWithAI(SAMPLE_RESUME,SAMPLE_JOB),statusIs(503));
}));
