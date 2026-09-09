# Supabase backend setup

The Express backend performs privileged graph/evidence writes, so it must use a **server-only Supabase credential**.

## Required server environment

Copy `server/.env.example` to `server/.env` and set:

```env
GOOGLE_API_KEY=...
PORT=3000
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

`SUPABASE_SECRET_KEY` is preferred. `SUPABASE_SERVICE_ROLE_KEY` is accepted only as a legacy fallback.

## Security rules

- Never use `SUPABASE_ANON_KEY` for backend writes.
- Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` through Vite/client environment variables.
- Never commit `server/.env`.
- Public/browser clients should use a Supabase publishable key and rely on RLS.
- The server secret bypasses RLS, so API endpoints that use it must enforce the application's own authorization rules before exposing privileged operations publicly.

## Evidence graph

The production Supabase project must include the Phase 3 evidence schema from:

`server/migrations/001_evidence_graph.sql`

Required tables:

- `documents`
- `claims`
- `claim_evidence`
- `claim_entities`
- `claim_relations`

The retrieval RPCs `match_nodes`, `match_chunks`, and `expand_graph` are also required.
