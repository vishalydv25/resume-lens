import { requestSchema } from "../../../lib/schema.ts";
import { buildReport } from "../../../lib/scoring.ts";
import { SAMPLE_RESUME, SAMPLE_JOB, SAMPLE_ANALYSIS } from "../../../lib/sample.ts";
import { assertSameOrigin, HttpError, isLiveEnabled, readBoundedJson, validAccessCode } from "../../../lib/security.ts";
import { enforceRateLimit } from "../../../lib/rate-limit.ts";
import { analyseWithAI } from "../../../lib/ai.ts";
export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store", "Content-Type": "application/json" };
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new HttpError(415, "Use application/json.");
    const parsed = requestSchema.safeParse(await readBoundedJson(request));
    if (!parsed.success) throw new HttpError(400, "Provide 100–8,000 resume characters, 100–4,000 job characters, consent, and a valid access code.");
    const input = parsed.data;
    if (input.mode === "demo") return Response.json(buildReport(SAMPLE_ANALYSIS, SAMPLE_RESUME, SAMPLE_JOB, "demo"), { headers });
    if (!isLiveEnabled()) throw new HttpError(503, "Live analysis has not been configured. You can still try the sample demo.");
    if (!validAccessCode(input.accessCode, process.env.APP_ACCESS_CODE ?? "")) throw new HttpError(401, "Incorrect access code. Ask the app owner for access.");
    await enforceRateLimit();
    const raw = await analyseWithAI(input.resume, input.job);
    try { return Response.json(buildReport(raw, input.resume, input.job, "live"), { headers }); }
    catch { throw new HttpError(502, "The AI result did not pass evidence checks. Try a clearer job description with explicit requirements."); }
  } catch (error) {
    const safe = error instanceof HttpError ? error : new HttpError(500, "Something went wrong. Please try again.");
    // Deliberately do not log resumes, job descriptions, access codes, or provider responses.
    return Response.json({ error: safe.message }, { status: safe.status,
      headers: { ...headers, ...(safe.retryAfter ? { "Retry-After": String(safe.retryAfter) } : {}) }
    });
  }
}
