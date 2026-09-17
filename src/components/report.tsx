"use client";
import type { Report } from "../lib/schema.ts";
import { Icon } from "./icons";
const labels = { supported: "Supported", partial: "Partial", not_found: "Not found" };
export function ReportView({ report }: { report: Report }) {
  function download() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "resume-lens-report.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="report-content">
    <div className="report-topline"><span className="eyebrow">{report.mode === "demo" ? "SAMPLE REPORT · NOT YOUR RESUME" : "YOUR RESUME REVIEW"}</span><button className="icon-button" onClick={download} title="Download report JSON" aria-label="Download report JSON"><Icon name="download" /></button></div>
    <div className="score-card"><div className="score-number">{report.score}<span>/100</span></div><div><h3>Estimated evidence coverage</h3><p>How well the resume documents the selected job requirements.</p></div></div>
    <details className="method"><summary>What does this score mean?</summary><p>Required items count twice as much as preferred items. Supported earns full credit, partial earns half, and not found earns zero. The score is rounded to the nearest whole number. AI chooses and classifies the requirements, so results can vary. This is not an ATS score, a hiring prediction, or a rating of a person.</p></details>
    <p className="report-summary">{report.summary}</p>
    {report.warnings.length > 0 && <div className="notice">{report.warnings.map(w => <p key={w}>{w}</p>)}</div>}
    <section className="report-section"><div className="section-line"><h3>Requirement coverage</h3><span className="muted">{report.requirements.length} reviewed</span></div>
      <div className="requirements">{report.requirements.map((r, i) => <details key={i} className="requirement"><summary><span><strong>{r.requirement}</strong><small>{r.importance === "required" ? "Required" : "Preferred"}</small></span><span className={`status ${r.status}`}>{labels[r.status]}</span></summary><div className="requirement-detail"><p>{r.explanation}</p><p className="quote-label">JOB DESCRIPTION</p><blockquote>{r.jobQuote}</blockquote>{r.evidence && <><p className="quote-label">RESUME EVIDENCE</p><blockquote>{r.evidence}</blockquote></>}</div></details>)}</div>
      <p className="caption">“Not found” means not stated in this resume—not that you lack the skill. Open an item to inspect the evidence.</p>
    </section>
    {report.strengths.length > 0 && <section className="report-section"><h3>What’s working</h3><ul className="strengths">{report.strengths.map((s, i) => <li key={i}><Icon name="check" size={18}/><span>{s}</span></li>)}</ul></section>}
    <section className="report-section"><h3>Your next improvements</h3>{report.improvements.length ? report.improvements.map((item, i) => <div className="improvement" key={i}><div className="improvement-heading"><h4>{item.title}</h4><span className="priority">{item.priority} priority</span></div><p>{item.advice}</p></div>) : <p className="muted">No specific improvements were returned. Review the evidence manually.</p>}</section>
    {report.rewrites.length > 0 && <section className="report-section"><h3>Sharper bullet points</h3><p className="caption">Suggested wording only. Check every claim before using it.</p>{report.rewrites.map((rewrite, i) => <div className="rewrite" key={i}><span className="quote-label">ORIGINAL</span><p className="before">{rewrite.original}</p><span className="quote-label">SUGGESTED</span><p>{rewrite.suggested}</p><p className="caption">{rewrite.reason}</p></div>)}</section>}
    <div className="report-footnote"><Icon name="shield" size={18}/><p>AI feedback can be wrong. Verify the quotes, classifications, and rewrites. Layout, fonts, and actual ATS parsing are not assessed.</p></div>
  </div>;
}
