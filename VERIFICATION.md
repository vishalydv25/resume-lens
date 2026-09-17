# Groq migration verification

## Verified in this environment
- 22 unit/API-handler tests passed with mocked providers. Coverage includes the Groq request URL, credentials, default/alternative models, strict JSON settings, low reasoning effort, output cap, response parsing, refusals, truncated output, malformed JSON, network errors, sanitized HTTP errors, propagated 429/Retry-After, input caps, authentication, quote grounding and scoring, and Redis fail-closed behaviour.
- Updated React source was bundled and server-rendered with preinstalled tooling. Desktop (1400px) and mobile (390px) renders were visually inspected: Groq consent/privacy wording fits without visible overlap or page overflow.
- The updater was applied to an isolated copy, rerun to check idempotence, and tested with a changed-file conflict. Existing .env.local and package-lock.json test files were preserved. The archive was integrity-checked.

## Not verified
- No real Groq or Redis API calls were made; no credentials were requested or used.
- The updated full Next.js build and complete TypeScript check were not run: Next.js and some declared dependencies are unavailable in this environment. Run npm run typecheck, npm test, and npm run build in your working local project.
- PDF/DOCX parsers were not rerun; only their size-limit message changed.
- This migration does not verify a deployed Vercel site or guarantee that a request fits a particular free-plan quota.

Tests ran using preinstalled Node 24, tsx and Zod 4.4.3. The project still declares Node 22.14+ and Zod 3.25-compatible dependencies; no dependency changes are part of the migration. Render checks used the application CSS without compiling its Tailwind import.
