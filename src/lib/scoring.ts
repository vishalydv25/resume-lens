import { analysisSchema, type Analysis, type Report, type Requirement } from "./schema.ts";
const normalized = (text: string) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
export function containsQuote(source: string, quote: string): boolean {
  const q = normalized(quote);
  return q.length > 0 && normalized(source).includes(q);
}
export function calculateScore(requirements: Requirement[]): number {
  const total = requirements.reduce((sum, r) => sum + (r.importance === "required" ? 2 : 1), 0);
  const earned = requirements.reduce((sum, r) => sum +
    (r.importance === "required" ? 2 : 1) * (r.status === "supported" ? 1 : r.status === "partial" ? 0.5 : 0), 0);
  return total ? Math.round(100 * earned / total) : 0;
}
export function buildReport(raw: unknown, resume: string, job: string, mode: "demo" | "live"): Report {
  const parsed: Analysis = analysisSchema.parse(raw);
  const warnings: string[] = [];
  const seen = new Set<string>();
  const requirements = parsed.requirements.map(r => {
    if (!containsQuote(job, r.jobQuote)) throw new Error("Ungrounded job requirement");
    const key = normalized(r.jobQuote);
    if (seen.has(key)) throw new Error("Duplicate job requirement");
    seen.add(key);
    if (r.status !== "not_found" && !containsQuote(resume, r.evidence)) {
      warnings.push(`Evidence could not be verified for: ${r.requirement}. Marked not found.`);
      return { ...r, status: "not_found" as const, evidence: "", explanation: "No verifiable source quote was returned. Review this requirement manually." };
    }
    return { ...r, evidence: r.status === "not_found" ? "" : r.evidence };
  });
  const rewrites = parsed.rewrites.filter(r => containsQuote(resume, r.original));
  if (rewrites.length !== parsed.rewrites.length) warnings.push("Some rewrites were omitted because the original text could not be verified.");
  return { ...parsed, requirements, rewrites, score: calculateScore(requirements), mode, warnings };
}
