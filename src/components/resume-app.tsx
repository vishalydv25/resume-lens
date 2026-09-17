"use client";
import { useEffect, useRef, useState } from "react";
import { MAX_JOB_CHARS, MAX_RESUME_CHARS, type Report } from "../lib/schema.ts";
import { SAMPLE_JOB, SAMPLE_RESUME } from "../lib/sample.ts";
import { Icon } from "./icons";
import { ReportView } from "./report";
export default function ResumeApp({ liveEnabled, initialReport = null }: { liveEnabled: boolean; initialReport?: Report | null }) {
  const [demo, setDemo] = useState(!liveEnabled);
  const [resume, setResume] = useState(liveEnabled ? "" : SAMPLE_RESUME);
  const [job, setJob] = useState(liveEnabled ? "" : SAMPLE_JOB);
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(initialReport);
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLElement>(null);
  const pending = useRef<AbortController | null>(null);
  const extractionVersion = useRef(0);
  useEffect(() => () => { pending.current?.abort(); extractionVersion.current++; }, []);
  function reset(asDemo: boolean) {
    pending.current?.abort(); extractionVersion.current++;
    setBusy(false); setExtracting(false); setDemo(asDemo); setReport(null); setError(""); setFileName("");
    setResume(asDemo ? SAMPLE_RESUME : ""); setJob(asDemo ? SAMPLE_JOB : ""); setConsent(false); setCode("");
    if (fileRef.current) fileRef.current.value = "";
  }
  async function readFile(file?: File) {
    if (!file || demo || busy || extracting) return;
    const version = ++extractionVersion.current;
    setError(""); setExtracting(true); setReport(null); setResume(""); setFileName("");
    try {
      const { extractResume } = await import("../lib/extract.ts");
      const text = await extractResume(file);
      if (version !== extractionVersion.current) return;
      setResume(text); setFileName(file.name); setTab("paste");
    } catch (e) {
      if (version === extractionVersion.current) setError(e instanceof Error ? e.message : "Could not read this file. Try pasting the text.");
    } finally {
      if (version === extractionVersion.current) { setExtracting(false); if (fileRef.current) fileRef.current.value = ""; }
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setReport(null);
    if (!demo && (!consent || resume.trim().length < 100 || job.trim().length < 100 || code.length < 16)) {
      setError("Add at least 100 characters in each text field, enter your access code, and confirm consent."); return;
    }
    setBusy(true);
    const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort("timeout"), 55000);
    try {
      const response = await fetch("/api/analyse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demo ? { mode: "demo" } : { mode: "live", resume, job, consent, accessCode: code }),
        signal: controller.signal
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Analysis failed. Please try again.");
      if (pending.current !== controller) return;
      setReport(result); setCode("");
      requestAnimationFrame(() => { reportRef.current?.focus({ preventScroll: true }); reportRef.current?.scrollIntoView({ behavior: "instant", block: "start" }); });
    } catch (e) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout") return;
      setError(controller.signal.reason === "timeout" ? "This request took too long. Please try again." : e instanceof Error ? e.message : "Could not connect. Try again.");
    } finally {
      clearTimeout(timer);
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }
  return <>
    <a className="skip-link" href="#workspace">Skip to analyser</a>
    <header className="site-header"><div className="shell header-inner"><a href="/" className="brand"><span className="brand-mark"><Icon name="document" size={22}/></span>resume<span className="brand-light">lens</span></a><nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><span className="mode-label"><span className="mode-dot"/>{demo ? "Sample demo" : "Live analysis"}</span></nav></div></header>
    <main className="shell">
      <section className="hero"><div><p className="eyebrow">YOUR EXPERIENCE, BETTER EXPRESSED</p><h1>A clearer resume.<br/><span>A more confident next step.</span></h1><p className="hero-copy">See how your experience lines up with a role—and what to make clearer before you apply.</p></div><button className="button secondary sample-button" onClick={() => reset(true)} disabled={busy || extracting}><Icon name="spark"/>Try a sample<Icon name="arrow" size={18}/></button></section>
      <div className="workflow" aria-label="Analysis steps"><span><b>01</b> Add your resume</span><span><b>02</b> Choose a role</span><span><b>03</b> Find your next improvements</span></div>
      {demo && <div className="demo-banner"><div><strong>You’re in sample mode.</strong> This uses a fictional resume and a saved example report. No AI request is made.</div>{liveEnabled ? <button className="text-button" onClick={() => reset(false)}>Use my resume <Icon name="arrow" size={16}/></button> : <a href="#setup-note">Enable live analysis ↓</a>}</div>}
      <div className="workspace" id="workspace">
        <form className="input-panel" onSubmit={submit}>
          <section className="card input-card"><div className="section-line"><h2><span className="step-number">1</span>Your resume</h2><span className="caption">PDF or DOCX · max 3 MB</span></div>
            {!demo && <div className="segmented" role="group" aria-label="Resume input method"><button type="button" aria-pressed={tab === "upload"} onClick={() => setTab("upload")} disabled={busy || extracting}>Upload file</button><button type="button" aria-pressed={tab === "paste"} onClick={() => setTab("paste")} disabled={busy || extracting}>Paste text</button></div>}
            {!demo && tab === "upload" ? <><input ref={fileRef} type="file" accept=".pdf,.docx" className="sr-only" tabIndex={-1} onChange={e => void readFile(e.target.files?.[0])} disabled={busy || extracting}/><button type="button" className="upload-zone" onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void readFile(e.dataTransfer.files[0]); }} disabled={busy || extracting}><span className="upload-icon"><Icon name="upload" size={24}/></span><strong>{extracting ? "Extracting text…" : "Drop your resume here"}</strong><span>{extracting ? "Reading locally in your browser" : "or click to choose a file"}</span><small>Text-based documents only. No OCR.</small></button></> : <><label htmlFor="resume" className="field-label">{demo ? "Fictional resume · Alex Morgan" : fileName ? `Review extracted text · ${fileName}` : "Resume text"}</label><textarea id="resume" className="resume-text" value={resume} readOnly={demo} disabled={busy || extracting} onChange={e => { setResume(e.target.value); setReport(null); }} maxLength={MAX_RESUME_CHARS} placeholder="Paste your resume, including skills, experience, projects, and education…" aria-describedby="resume-count"/><p className="field-meta" id="resume-count"><span>{demo ? "Read-only sample" : "Review extraction order; remove personal details if desired."}</span><span>{resume.length.toLocaleString()} / {MAX_RESUME_CHARS.toLocaleString()}</span></p></>}
            <p className="privacy-inline"><Icon name="shield" size={16}/><span>Files stay in your browser. Only text is sent for live analysis.</span></p>
          </section>
          <section className="card input-card"><div className="section-line"><h2><span className="step-number">2</span>The role you want</h2></div><label className="field-label" htmlFor="job">Job description</label><textarea id="job" className="job-text" value={job} readOnly={demo} disabled={busy} onChange={e => { setJob(e.target.value); setReport(null); }} maxLength={MAX_JOB_CHARS} placeholder="Paste the job description. Include the responsibilities, required skills, and preferred qualifications." aria-describedby="job-count"/><p className="field-meta" id="job-count"><span>{demo ? "Read-only sample" : "At least 100 characters"}</span><span>{job.length.toLocaleString()} / {MAX_JOB_CHARS.toLocaleString()}</span></p></section>
          {!demo && <section className="card input-card"><label className="field-label" htmlFor="access-code">App access code</label><input id="access-code" type="password" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" maxLength={256} disabled={busy} placeholder="Provided by the app owner"/><label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy}/><span>I have permission to use this content and agree to send the resume and job-description text to Groq for analysis. <a href="#privacy">Privacy details</a></span></label></section>}
          {error && <div role="alert" className="error-box">{error}</div>}
          <button className="button primary analyse-button" type="submit" disabled={busy || extracting || (!demo && (!consent || resume.trim().length < 100 || job.trim().length < 100 || code.length < 16))}><Icon name="spark"/>{busy ? "Reviewing the evidence…" : demo ? "Explore the sample report" : "Analyse my resume"}{!busy && <Icon name="arrow"/>}</button>
          <p className="submit-note" role="status" aria-live="polite">{busy ? (demo ? "Loading the saved sample review…" : "Live analysis may take up to 45 seconds. Please keep this tab open.") : demo ? "Free sample · no account or API key required" : "No resume database. No automatic hiring decisions."}</p>
          {!demo && <button type="button" className="text-button clear-button" onClick={() => reset(false)}>Clear my data</button>}
        </form>
        <section className="card results-panel" ref={reportRef} tabIndex={-1} aria-label="Analysis results" aria-busy={busy}>{report ? <ReportView report={report}/> : <div className="empty-report"><div className="section-line"><h2><Icon name="document"/>Your review</h2><span className="caption">{busy ? "In progress" : "Ready when you are"}</span></div><div className="empty-main"><span className={`empty-symbol ${busy ? "pulse" : ""}`}><Icon name="spark" size={32}/></span><h3>{busy ? "Connecting experience to evidence." : "Less guesswork.\nMore direction."}</h3><p>{busy ? "Checking requirements, finding supporting quotes, and shaping practical feedback." : "A useful review starts with the role—not a generic score."}</p></div><div className="preview-points"><div><span>01</span><p><strong>See the match</strong>Requirements linked to evidence in your resume.</p></div><div><span>02</span><p><strong>Know what to improve</strong>Prioritised, specific advice you can act on.</p></div><div><span>03</span><p><strong>Make every bullet count</strong>Clearer wording, without invented achievements.</p></div></div><div className="report-footnote"><Icon name="shield" size={18}/><p>A writing assistant, not a hiring verdict. Scores are approximate and not official ATS scores.</p></div></div>}</section>
      </div>
      <section className="info-grid" id="how-it-works"><div><p className="eyebrow">BUILT FOR YOUR NEXT STEP</p><h2>Evidence first.<br/>You stay in control.</h2></div><div><h3>How it works</h3><p>Upload or paste your resume, add a job description, and review the feedback. Open each requirement to inspect its source quotes. Only use advice that accurately reflects your experience.</p></div><div id="privacy"><h3>A little more private</h3><p>Resume files are parsed locally. In live mode, text is sent to this app’s server and Groq. The app does not save it to a database or analytics. Provider and hosting retention policies still apply. Exported reports can contain resume excerpts.</p></div></section>
      {!liveEnabled && <aside className="setup-note" id="setup-note"><strong>Running your own copy?</strong> Configure the server-side API key and app access code to enable live analysis. Production also requires the shared Redis rate limiter. See README.md in the project.</aside>}
    </main>
    <footer className="shell site-footer"><span>Resume Lens</span><span>Clear feedback. Honest applications.</span><a href="#privacy">Privacy & limitations</a></footer>
  </>;
}
