# Resume editor

Internal tool for a resume-editing business. One linear workflow per revision, with contractor assignments, comments, AI assist, and exports.

## Setup

1. Create a Supabase project and run `supabase/migrations/20260905120000_init.sql`.
2. Copy `.env.example` to `.env.local` and fill in the keys.
3. `npm install`, then `npm test` and `npm run dev`.

The first account to sign up becomes the owner. Later accounts are contractors and only see assigned resumes.

Local Postgres (optional): `npx supabase start`, copy the URL and keys from `npx supabase status` into `.env.local`, then `npm run dev`. Studio is listed in that status output. Stop with `npx supabase stop`.

AI suggestions need `AI_GATEWAY_API_KEY`. Without it, the rest of the app still works and the AI panel shows a fallback.

## Tests and CI

- `npm test` — Vitest unit, API, and editor UI tests
- `npm run test:coverage` — same tests with v8 coverage (CI fails under 70%)
- `npm run lint` and `npm run typecheck`

Pull requests and pushes to `main` run those checks in GitHub Actions (`.github/workflows/ci.yml`). Coverage reports are uploaded as a workflow artifact.

## Flow

Dashboard → new resume → upload → formatting → contact → one experience at a time → projects → education → skills → export. Start the next revision from the overview when the client replies. LinkedIn copy and analysis live off the same data.
