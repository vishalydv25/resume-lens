import { z } from "zod";
export const MAX_RESUME_CHARS = 8000;
export const MAX_JOB_CHARS = 4000;
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const requestSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("demo") }).strict(),
  z.object({
    mode: z.literal("live"),
    resume: z.string().trim().min(100).max(MAX_RESUME_CHARS),
    job: z.string().trim().min(100).max(MAX_JOB_CHARS),
    consent: z.literal(true),
    accessCode: z.string().min(16).max(256)
  }).strict()
]);
export const requirementSchema = z.object({
  requirement: z.string().min(1).max(500),
  jobQuote: z.string().min(1).max(1000),
  importance: z.enum(["required", "preferred"]),
  status: z.enum(["supported", "partial", "not_found"]),
  evidence: z.string().max(1200),
  explanation: z.string().min(1).max(1500)
}).strict();
export const analysisSchema = z.object({
  summary: z.string().min(1).max(2000),
  requirements: z.array(requirementSchema).min(1).max(12),
  strengths: z.array(z.string().min(1).max(800)).max(5),
  improvements: z.array(z.object({
    title: z.string().min(1).max(200),
    advice: z.string().min(1).max(1200),
    priority: z.enum(["high", "medium", "low"])
  }).strict()).max(6),
  rewrites: z.array(z.object({
    original: z.string().min(1).max(1500),
    suggested: z.string().min(1).max(1500),
    reason: z.string().min(1).max(800)
  }).strict()).max(4)
}).strict();
export type Analysis = z.infer<typeof analysisSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
export type Report = Analysis & { score: number; mode: "demo" | "live"; warnings: string[] };
// Explicit JSON Schema keeps the provider integration independent of its SDK.
const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false
});
export const analysisJsonSchema = obj({
  summary: str,
  requirements: { type: "array", items: obj({
    requirement: str, jobQuote: str,
    importance: { type: "string", enum: ["required", "preferred"] },
    status: { type: "string", enum: ["supported", "partial", "not_found"] },
    evidence: str, explanation: str
  }) },
  strengths: { type: "array", items: str },
  improvements: { type: "array", items: obj({ title: str, advice: str,
    priority: { type: "string", enum: ["high", "medium", "low"] }
  }) },
  rewrites: { type: "array", items: obj({ original: str, suggested: str, reason: str }) }
});
