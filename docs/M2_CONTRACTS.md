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
- The `m2_persistence` migration was applied to the linked hosted Supabase
  project `Onconourish`. The synthetic seed was applied; it created 3 patients,
  5 profiles, 16 check-ins, 24 offered actions, and 23 food items.
- `supabase/tests/policies.sql` assertions were executed against that
  project's PostgreSQL database through the Supabase SQL tool, using the
  script's simulated JWT subject claims. They passed and the test transaction
  rolled back its fixtures. This verifies database RLS behavior for those
  assertions, but is not an end-to-end sign-in or PostgREST/API integration
  test.
- Supabase Security Advisor reports the `measurement_summary` view as
  `SECURITY DEFINER` and reports the authorization helper functions as
  executable by API roles. This is an open security finding; do not use this
  schema with real patient data. Review the view's intended cohort scope,
  change it to invoker-safe access, move callable helpers out of the exposed
  API schema (or otherwise prevent RPC access), then rerun the SQL policy
  tests and Security Advisor.
- Supabase also reports leaked-password protection as disabled for Auth. This
  is a project Auth setting, separate from the migration.
- The brief requests 24 foods, but M1 found only 23 in the prototype; the seed
  intentionally uses those 23 without inventing clinical data.

## M3 patient UI handoff to M4

The patient demo route uses server actions in `src/app/patient/actions.ts`.
Those actions explicitly select the in-memory demo repository and are fixed to
the synthetic Layla record. They are not authenticated API routes and must not
be treated as an authorization boundary. Demo state is process-local, resets on
restart, and may not be shared across deployments or serverless isolates.

M4 owns the authenticated API routes. When replacing the M3 demo calls, keep
the patient UI on the repository and engine contracts, derive identity from the
server-side session rather than client-supplied IDs, and preserve explicit
validation and error responses. Add the authorized alert writer required for
the end-to-end check-in-to-clinician flow; the shared repository still exposes
alert reads only. Do not expose a service-role key to the browser.

New Arabic UI copy in M3 is machine-drafted and requires native-speaker and
clinical review before use. The linked Supabase project has open Security
Advisor findings recorded above; do not use it with real patient data.
