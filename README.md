# Resume editor

Internal tool for a resume-editing business. One linear workflow per revision, with contractor assignments, comments, AI assist, and exports.

## Setup

1. Create a Supabase project and run `supabase/migrations/20260905120000_init.sql`.
2. Copy `.env.example` to `.env.local` and fill in the keys.
3. `npm install` then `npm test` and `npm run dev`.

The first account to sign up becomes the owner. Later accounts are contractors and only see assigned resumes.

## Flow

Dashboard → new resume → upload → formatting → contact → one experience at a time → projects → education → skills → export. Start the next revision from the overview when the client replies. LinkedIn copy and analysis live off the same data.
