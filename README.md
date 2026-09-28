# Golf Practice Tracker

Phone-first web app for logging practice shots by club and swing type, with a
bag of carry/total distances and per-session and long-term result stats.
Metric (metres) only.

## Run it

```bash
npm install
npm run dev
```

The dev server listens on your network (`--host`), so you can open the
`Network:` URL it prints on your phone while it's on the same Wi-Fi.

`npm run build` produces a static site in `dist/` for any static host.

## Cloud sync (Supabase)

Without Supabase settings the app runs local-only. To enable login and sync:

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key.
3. Add the same two variables in Vercel → Project → Settings → Environment Variables.

Each user's data is one `app_state` row (JSON), protected by row level security.
Changes save locally first and push to Supabase shortly after; last write wins across devices.

## Structure

- `src/data/` – types, defaults, pure state actions, selectors, and the store
  (currently persisted to `localStorage`; Supabase sync goes behind `store.tsx`).
- `src/lib/` – formatting, stats (tally/grouping), id generation.
- `src/pages/` – one file per screen.
- `src/components/` – layout/nav and the result breakdown table and bar.
