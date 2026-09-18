# Resume Lens

A deployable **Next.js + TypeScript resume-coaching MVP** with a working, key-free sample mode and an optional Groq-backed live mode. It compares evidence in a resume against a job description. It is not an employer ATS simulator or an automated hiring tool.

#Live demo: https://resume-lens-wheat-pi.vercel.app/

## 1. Prerequisites

Install **Node.js 22.14+** (Node 22 LTS recommended), npm, and an editor such as VS Code. You do not need Python. For deployment, create your own GitHub and Vercel accounts. Live analysis also needs Groq API access on its Free Plan with model access, plus an Upstash Redis database in production. Stay on free plans to avoid service fees; usage quotas and eligibility apply. The sample demo makes no AI calls.

## 2. Start locally — no API key needed

Extract the ZIP, open a terminal in the `resume-lens` folder (the one containing `package.json`), then run:

```bash
npm install
npm run dev
```

Open **http://localhost:3000** and choose **Explore the sample report**. The fictional resume and saved report are deliberately read-only. Demo results are never presented as an analysis of uploaded content.

`npm install` also copies the PDF parsing worker into `public/`. Do not skip install scripts. This archive does not include `node_modules` or a lockfile because package-registry access was unavailable in the build environment. The first install resolves the declared compatible dependency ranges. Commit the generated `package-lock.json`; use `npm ci` thereafter. Verify updated packages and security advisories before public deployment.

## 3. Enable real AI analysis locally

Copy `.env.example` to `.env.local`:

```bash
# macOS / Linux
cp .env.example .env.local
# Windows PowerShell (use this instead)
# Copy-Item .env.example .env.local
```

In your editor, add:

```dotenv
GROQ_API_KEY=your-own-api-key
GROQ_MODEL=openai/gpt-oss-120b
APP_ACCESS_CODE=your-random-long-access-code
```

Generate a random access code of at least 24 characters in a password manager (the app enforces a 16-character minimum). This is a **shared app access code**, not your Groq key. Keep the API key server-side; never use `NEXT_PUBLIC_` for secrets or paste them into a chat. The sample key values above are placeholders, not usable credentials.

Restart the development server. With the key and access code configured, the app opens in live mode. Upload a text-based PDF/DOCX or paste text, review extracted text, paste a job description, enter the access code, and tick the consent checkbox. Try the sample button at any time without spending API credits. The “Use my resume” button returns from sample mode to live mode.

Only text is sent to the backend and Groq, not the original file. The app uses ordinary Groq chat completions with no persistence features. It does not promise zero provider retention. Review Groq Data Controls, consider enabling Zero Data Retention, and remove unnecessary personal details before submission.

## 4. Verify your installation

```bash
npm run typecheck
npm test
npm run build
npm start
```

`npm start` uses a production server. Live mode in production also requires Redis configuration (step 5); without it, the production app intentionally remains in sample mode. Stop the dev server first if port 3000 is in use.

For browser tests, stop the running server or ensure it is in demo mode, then:

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright configuration starts the development server with live secrets disabled. Browser tests cover the demo report, expandable evidence, export, reset, and recoverable API errors on desktop and mobile.

See `VERIFICATION.md` for exactly what was and was not tested while this archive was created. Do not interpret a source-level check as a verified production build.

## 5. Deploy to Vercel

### A. Publish the project to your own GitHub repository

Create an empty repository on GitHub. From the project folder:

```bash
git init
git add .
git commit -m "Build Resume Lens MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace the URL with your repository URL. `.env.local` is excluded by `.gitignore`. Check staged files before pushing; do not commit keys, real resumes, or downloaded reports.

### B. Import into Vercel

1. Add a new Vercel project and import the repository.
2. Keep the **Next.js** framework preset. The root directory must contain `package.json`.
3. Use Node.js **22.x**, install command `npm ci` once the lockfile is committed (otherwise `npm install`), and build command `npm run build`.
4. Deploy. With no secrets, the site runs safely in sample mode.

The app needs a server runtime; do not configure a static export or deploy it to GitHub Pages. `/api/analyse` uses the Node runtime and requests a 60-second function duration. Confirm that your hosting plan supports this duration.

### C. Enable live mode on the deployment

Create an Upstash Redis database, find its **REST URL** and **REST token**, and add these server-side environment variables in Vercel:

| Variable | Value |
| --- | --- |
| `GROQ_API_KEY` | Your Groq API key |
| `GROQ_MODEL` | `openai/gpt-oss-120b` (default) or `openai/gpt-oss-20b`; this integration supports these two models |
| `APP_ACCESS_CODE` | A strong, random shared access code |
| `UPSTASH_REDIS_REST_URL` | Your HTTPS Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Your Redis REST token |
| `LIVE_REQUESTS_PER_MINUTE` | `1` to start |
| `LIVE_REQUESTS_PER_DAY` | `50` to start; lower this to fit your account quota |
| `APP_ORIGIN` | Optional canonical site URL, such as `https://your-project.vercel.app` |

Redeploy after changing environment variables. Scope credentials to environments you intend to enable; keep preview deployments in sample mode if appropriate. If you set `APP_ORIGIN`, requests must use that exact origin. Omit it when testing multiple trusted deployment URLs or set it separately per environment.

The Redis limits are **global for this app**, not per person: at most 1 accepted live request in each fixed UTC minute window and 50 in each fixed UTC day by default. Limit checks are atomic. Provider failures still consume a request. This bounds request counts, not exact dollar spend. Review provider usage, configure available budget controls, and tune the limits to your needs. A rate-limiter outage fails closed instead of spending unbounded credits.

### D. Deployment smoke test

- Open the deployed URL in desktop and mobile browsers.
- Run the sample review without entering a key.
- Confirm that a wrong app access code is rejected in live mode.
- Submit a short, non-sensitive test resume and job description; confirm real feedback and evidence quotes.
- Test PDF and DOCX extraction with your own non-sensitive fixtures; check text order.
- Inspect the browser Network panel: the original document must not be uploaded, and no API key should appear in browser code or requests.
- Check the hosting logs for unexpected errors, without adding content logging.
- Test the configured rate limit and confirm it returns a friendly error.

## Features

- Responsive, keyboard-accessible interface with system light/dark themes.
- Text-based PDF parsing using PDF.js, DOCX raw-text extraction using Mammoth, and paste-text fallback.
- 3 MB file cap, 20-page PDF cap, 8,000-character resume cap, and 4,000-character job-description cap.
- Explicit consent before sending live text.
- Groq Chat Completions API with strict structured JSON output and runtime schema validation.
- Source-quote checks, deterministic weighted evidence-coverage calculation, and grounded rewrite originals.
- Prioritised advice, expandable evidence, JSON export, and a clear-data button.
- No account, resume database, advertising analytics, or automatic resume storage.
- Shared-secret access gate, atomic Redis request limits, bounded request bodies, generic upstream errors, and no content logging in application code.

## How the score works

The AI extracts up to 12 distinct job requirements and classifies resume evidence for each:

- **Supported** = 1 point.
- **Partial** = 0.5 points.
- **Not found** = 0 points.
- Required items carry weight 2; preferred items carry weight 1.

`score = round(100 × weighted earned points ÷ total available weight)`

The sample earns 9.5 / 13 weighted points = **73/100**. This is an estimated coverage score for selected requirements, not an official ATS score, an objective ranking, or a hiring probability. The AI's selected requirements and their interpretation may vary. Quote matching checks that source text exists; it does not prove that the model's interpretation is correct. Review the evidence yourself.

## Architecture / where to learn

```text
src/
  app/
    page.tsx                 Server page; exposes only a live-enabled boolean
    layout.tsx               Metadata and global stylesheet
    globals.css              Responsive light/dark design
    not-found.tsx            404 page
    api/analyse/route.ts      Request validation → auth → limits → AI → verification
  components/
    resume-app.tsx           Form state, parsing flow, errors, consent, reset
    report.tsx               Report, source quotes, scoring notes, JSON export
    icons.tsx                Small inline vector UI icons
  lib/
    extract.ts               Browser-only PDF/DOCX extraction
    schema.ts                Shared input/output validation and JSON Schema
    ai.ts                    Server-side provider call and coaching instructions
    scoring.ts               Quote checks and deterministic scoring
    security.ts              Access-code check, origin guard, bounded JSON reader
    rate-limit.ts            Redis production limiter / local development fallback
    sample.ts                Fictional data and a transparent saved demo
  types/mammoth.d.ts          Browser import type declaration
scripts/copy-pdf-worker.mjs   Copies PDF.js worker after installation
tests/                       Unit and API-handler tests with provider mocks
e2e/                         Playwright demo checks
.github/workflows/ci.yml      Install, type-check, tests, build, browser tests
```

The interface uses semantic React elements with tailored CSS; Tailwind v4 is configured so you can extend it with utility classes. No separate Express server, Python service, Groq SDK, vector database, or paid authentication platform is required. shadcn/ui is intentionally not included: these small controls do not need an additional component layer.

### Suggested learning order

1. Run the demo and inspect `sample.ts`.
2. Change the heading and inputs in `resume-app.tsx`.
3. Inspect the POST request and `route.ts`.
4. Read the rubric and tests in `scoring.ts` / `core.test.ts`.
5. Configure live mode and test a non-sensitive resume.
6. Run the checks, commit the lockfile, and deploy.

## Limitations and next steps

This is a deployable **personal/portfolio MVP**, not a production multi-tenant recruiting system. The shared code is intentionally simple; replace it with real user authentication, per-user quotas, and abuse controls before an unrestricted public launch. Add host/WAF request limits as appropriate. The global limiter does not stop every kind of abuse or replace spending controls.

- No OCR. Scanned PDFs need conversion to text first.
- No visual-layout/ATS-format validation. Multi-column PDFs can extract in the wrong order; users must review the text.
- DOCX/PDF parsing happens in the browser. Complex or malformed documents may be slow or fail; the size cap is not a complete defence against malicious compressed documents. Use paste-text fallback. Keep parser dependencies patched; consider isolated parsing workers with time/memory limits before accepting untrusted third-party document collections.
- The model may misinterpret evidence or make unsuitable suggestions. Do not use this tool for automated selection, ranking, or rejection of applicants.
- Input guards and instructions reduce prompt-injection risk but do not eliminate it. The model has no tools, credentials, or arbitrary URL-fetching capability.
- Clear data removes the current form and report from React state; it does not reverse an already-submitted provider request or guarantee secure browser-memory erasure. A local JSON export contains excerpts; handle it as personal data.
- The app itself does not persist resumes, but hosting providers, browser extensions, and AI providers have their own policies. Assess those before using sensitive data or someone else's resume.
- Model choice, availability, dependency updates, billing, and hosting-plan limits need verification in your own environment.

## Troubleshooting

**Still in sample mode?** Restart/redeploy after adding the API key and a 16+ character app access code. Production also requires both Redis REST variables.

**PDF worker cannot load?** Run `node scripts/copy-pdf-worker.mjs`, then restart. The worker must match the installed PDF.js version and be reachable at `/pdf.worker.min.mjs`.

**Little or garbled extracted text?** Use a text-based PDF, DOCX, or paste corrected text. OCR and layout repair are not included.

**403 error?** Open the app at its correct URL. Remove or correct `APP_ORIGIN` if it points at a different deployment. Non-browser API callers must supply matching Origin and Host headers; this is not a public cross-origin API.

**401 error?** Use the app access code, not the Groq key.

**429 error?** Either the app limit or Groq's request/token quota was reached. The message identifies which. Wait as indicated by Retry-After; shorten the text if the provider limit persists. The application never retries automatically or upgrades your plan.

**502/503/504 error?** Check model/API access, provider quota, Redis settings, and function duration. Do not expose raw provider errors or log submitted resume text. Incomplete or ungrounded results are intentionally rejected.

**Dependency install/build fails?** Confirm Node 22.14+, internet access, and a supported npm version. Install without skipping scripts, inspect the reported package/type errors, and run the checks again. Do not deploy until `npm run build` succeeds.

## Groq migration notes

No new npm dependencies are required for this migration: the server uses native `fetch`. The `openai/` prefix in the model ID is Groq's model namespace, not a paid OpenAI API call. The endpoint is `https://api.groq.com/openai/v1/chat/completions`. Only `GROQ_API_KEY` is read.

The output budget is 3,000 completion tokens with low reasoning effort. Input caps are 8,000 resume characters and 4,000 job characters, with compact reports requested. **Character counts are not token counts**; these defaults reduce request size but cannot guarantee a fit for every language, document, or account quota. A large request may still receive 413/429; shorten it instead of repeatedly retrying. The 50/day app limit is not a guarantee of 50 successful reports: token quotas or other activity on the same Groq account can stop requests sooner.

For a zero-service-fee personal portfolio deployment, choose Groq Free, Vercel Hobby (personal/non-commercial use), Upstash Redis Free, and the default deployment address. Do not enable paid plans or automatic upgrades. Free-plan terms and quotas can change; availability within every quota is not guaranteed.

Official references checked during migration:
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/reasoning
- https://console.groq.com/docs/rate-limits
- https://console.groq.com/docs/your-data
