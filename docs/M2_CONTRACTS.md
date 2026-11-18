# M2 handoff contracts

Synthetic data only. This is a prototype, not a clinically validated system.

## Shared repository

The shared interface is `src/lib/repository.ts`. IDs are opaque strings. A
repository instance is bound to an authenticated session; the backend remains
the authority on access. Client-supplied actor IDs must never be treated as
authorization. The in-memory implementation is for demonstrations only and
does not provide an authentication or security boundary.

The demo repository is one process-local instance shared by patient and
clinician server code within the same JavaScript runtime. It resets when the
process restarts and is not shared between processes, deployments, isolates,
or browsers. It must not be used for real data or described as durable
persistence. M3 and M4 must access it on the server and must not copy this
state into independent stores.

Check-ins are represented by M1's `CheckIn`. Approved plans are versioned;
only an assigned clinician with care-team sharing consent can approve one in
the persistent backend. Consent is stored independently by purpose. A patient
can revoke care-team sharing to prevent their clinician from reading their
records. Patient-supplied free text is not available to clinicians: symptom
and food IDs are constrained and barrier events are owner-only.

The current repository exposes alert reads but not alert creation. M4 must add
an authorized server-side alert writer and its demo equivalent before the
combined check-in-to-alert flow can work. Do not expose a service-role key to
the browser or rely on it as the authorization check. Derive and validate
alert evidence with the engine; it must never contain patient-entered free text.
Plan items are action IDs; notes are clinician-authored.

## Future routes

M4 owns route implementation. All routes require server-side session
authentication, authorization against the patient record, input validation,
and explicit error responses. IDs in requests never grant access.

| Route | Request | Successful response | Authorization |
| --- | --- | --- | --- |
| `POST /api/checkin` | `{ patientId, checkIn }` | `{ checkIn, alerts }` | patient owner |
| `POST /api/ask` | `{ patientId, text, locale }` | `{ response }` | patient owner; guardrails run first |
| `POST /api/plan/approve` | `{ patientId, items, note }` | `{ plan }` | assigned clinician with care-team consent |
| `POST /api/ramadan` | `{ patientId, action }` where action is `request`, `clear`, or `decline` | `{ request }` | owner requests; assigned clinician with care-team consent decides |
| `GET /api/export/[patientId]` | patient ID in path | authorized summary | owner or assigned clinician with care-team consent |

These are handoff contracts, not implemented endpoints. Do not send urgent
symptoms to a model or return food advice for urgent cases. Authorization and
consent restrictions must be enforced in the database, not just in routes.

## M2 verification handoff

- `pnpm test`: 60 tests passed; `pnpm typecheck` and `pnpm build` passed.
- The migration, idempotent seed, and `supabase/tests/policies.sql` passed in
  PGlite 0.5.16 using a minimal test-only `auth.users` and `auth.uid()` shim.
- The migration has **not** been applied to a Supabase project, and the SQL
  tests have **not** run against Supabase Auth or its PostgREST API. Repeat the
  documented `psql` checks on a dedicated test database before relying on
  those integrations. Docker daemon access was unavailable in this session.
- The brief requests 24 foods, but M1 found only 23 in the prototype; the seed
  intentionally uses those 23 without inventing clinical data.
