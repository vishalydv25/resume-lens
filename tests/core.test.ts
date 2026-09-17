import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, calculateScore, containsQuote } from "../src/lib/scoring.ts";
import { SAMPLE_ANALYSIS, SAMPLE_JOB, SAMPLE_RESUME } from "../src/lib/sample.ts";
import { requestSchema } from "../src/lib/schema.ts";
import { HttpError, isLiveEnabled, readBoundedJson, validAccessCode } from "../src/lib/security.ts";

test("sample fixture passes grounding and has a deterministic score", () => {
  const result = buildReport(SAMPLE_ANALYSIS, SAMPLE_RESUME, SAMPLE_JOB, "demo");
  assert.equal(result.score, 73); // 9.5 / 13 weighted points
  assert.equal(result.requirements.length, 8);
  assert.equal(result.rewrites.length, 2);
  assert.deepEqual(result.warnings, []);
});
test("score uses importance weighting and partial credit", () => {
  const a = SAMPLE_ANALYSIS.requirements[0];
  assert.equal(calculateScore([]), 0);
  assert.equal(calculateScore([{...a, status: "supported"}]), 100);
  assert.equal(calculateScore([{...a, status: "partial"}]), 50);
  assert.equal(calculateScore([{...a, status: "not_found"}]), 0);
  assert.equal(calculateScore([{...a, status: "supported"}, {...a, importance: "preferred", status: "not_found"}]), 67);
});
test("quotes normalize whitespace but never accept empty strings", () => {
  assert.equal(containsQuote("React\n and  TypeScript", "react and typescript"), true);
  assert.equal(containsQuote("React", ""), false);
  assert.equal(containsQuote("React", "Python"), false);
});
test("unsupported resume evidence is downgraded and score recalculated", () => {
  const raw = structuredClone(SAMPLE_ANALYSIS);
  raw.requirements[0].evidence = "Invented experience with React";
  const report = buildReport(raw, SAMPLE_RESUME, SAMPLE_JOB, "live");
  assert.equal(report.requirements[0].status, "not_found");
  assert.equal(report.requirements[0].evidence, "");
  assert.equal(report.score, 58);
  assert.equal(report.warnings.length, 1);
});
test("fabricated job quotes and duplicates fail the report", () => {
  const raw = structuredClone(SAMPLE_ANALYSIS);
  raw.requirements[0].jobQuote = "Must know COBOL";
  assert.throws(() => buildReport(raw, SAMPLE_RESUME, SAMPLE_JOB, "live"));
  raw.requirements[0] = {...raw.requirements[1]};
  assert.throws(() => buildReport(raw, SAMPLE_RESUME, SAMPLE_JOB, "live"));
});
test("rewrites with invented originals are omitted", () => {
  const raw = structuredClone(SAMPLE_ANALYSIS);
  raw.rewrites[0].original = "I increased sales by 200%.";
  const report = buildReport(raw, SAMPLE_RESUME, SAMPLE_JOB, "live");
  assert.equal(report.rewrites.length, 1);
  assert.equal(report.warnings.length, 1);
});
test("input validation enforces consent, size, code and explicit mode", () => {
  assert.equal(requestSchema.safeParse({mode:"demo"}).success, true);
  assert.equal(requestSchema.safeParse({mode:"demo", resume:"secret"}).success, false);
  const live = {mode:"live", resume:SAMPLE_RESUME, job:SAMPLE_JOB, consent:true, accessCode:"long-example-code-12345"};
  assert.equal(requestSchema.safeParse(live).success, true);
  assert.equal(requestSchema.safeParse({...live, consent:false}).success, false);
  assert.equal(requestSchema.safeParse({...live, resume:"x".repeat(8001)}).success, false);
  assert.equal(requestSchema.safeParse({...live, resume:"  "}).success, false);
  assert.equal(requestSchema.safeParse({...live, job:"x".repeat(4001)}).success, false);
});
test("production fails closed without rate limiter", () => {
  const env = {GROQ_API_KEY:"test-only", APP_ACCESS_CODE:"long-example-code-12345", NODE_ENV:"production"};
  assert.equal(isLiveEnabled(env), false);
  assert.equal(isLiveEnabled({...env, NODE_ENV:"development"}), true);
  assert.equal(isLiveEnabled({...env, UPSTASH_REDIS_REST_URL:"https://example.test", UPSTASH_REDIS_REST_TOKEN:"test"}), true);
  assert.equal(isLiveEnabled({...env, NODE_ENV:"development", APP_ACCESS_CODE:"short"}), false);
});
test("access-code comparison handles unequal input lengths", () => {
  assert.equal(validAccessCode("long-example-code-12345", "long-example-code-12345"), true);
  assert.equal(validAccessCode("wrong", "long-example-code-12345"), false);
  assert.equal(validAccessCode("", ""), false);
});
test("body parser rejects invalid and oversized JSON, even without content-length", async () => {
  assert.deepEqual(await readBoundedJson(new Request("https://example.test", {method:"POST", body:'{"ok":true}'})), {ok:true});
  await assert.rejects(readBoundedJson(new Request("https://example.test", {method:"POST", body:"{"})), (e: unknown) => e instanceof HttpError && e.status === 400);
  await assert.rejects(readBoundedJson(new Request("https://example.test", {method:"POST", body:'"' + "x".repeat(100) + '"'}), 20), (e: unknown) => e instanceof HttpError && e.status === 413);
});
