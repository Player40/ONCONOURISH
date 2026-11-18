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
persistence. M3 and M4 access it on the server and must not copy this state
into independent stores.

Check-ins are represented by M1's `CheckIn`. Approved plans are versioned;
only an assigned clinician with care-team sharing consent can approve one in
the persistent backend. Consent is stored independently by purpose. A patient
can revoke care-team sharing to prevent their clinician from reading their
records. Patient-supplied free text is not available to clinicians: symptom
and food IDs are constrained and barrier events are owner-only.

M4 adds `recordCheckIn` and derives alert evidence with the engine; it never
contains patient-entered free text. In demo mode, the repository records alerts
in process memory. With Supabase, a separate server-only service-role function
commits the check-in, alerts, and audit event atomically after rechecking
ownership and stale history. Do not expose a service-role key to the browser or
rely on it as the authorization check.

## Route contracts

All routes and Server Actions must authenticate, authorize, validate input,
and derive identity server-side. IDs in requests never grant access.

| Route | Request | Successful response | Authorization |
| --- | --- | --- | --- |
| `POST /api/checkin` | `{ patientId, checkIn }` | `{ checkIn, alerts }` | patient owner |
| `POST /api/ask` | `{ patientId, text, locale }` | `{ response }` | patient owner; guardrails run first |
| `POST /api/plan/approve` | `{ patientId, items, note }` | `{ plan }` | assigned clinician with care-team consent |
| `POST /api/ramadan` | `{ patientId, action }` where action is `request`, `clear`, or `decline` | `{ request }` | owner requests; assigned clinician with care-team consent decides |
| `GET /api/export/[patientId]` | patient ID in path | authorized summary | owner or assigned clinician with care-team consent |

Do not send urgent symptoms to a model or return food advice for urgent cases.
Authorization and consent restrictions must be enforced in the database, not
just in routes.

## M2–M4 verification record

These are historical environment checks, not guarantees about the current
linked project:

- The M2 persistence migration and synthetic seed were applied to the linked
  hosted Supabase project. M2 policy assertions ran in a rollback transaction.
- Migration `202611180002_m4_clinician_workflow.sql` and its policy assertions
  were applied/run against the linked synthetic project. M4 moved authorization
  helpers into `onconourish_private`, restricted direct check-in/audit writes,
  and revoked API access to `measurement_summary`.
- The M2-only policy script is a historical baseline; its view/direct-write
  assertions are superseded by M4.
- Prior Node 26.13.1 checks passed 72 tests, typecheck, and build before the
  current M5/M6 changes. Current results are in `docs/EVAL_REPORT.md` and the
  handoff summary, not inferred from that earlier run.
- Live Auth sign-in and persistent patient writes were not verified. A
  Supabase Auth user must have a provisioned `profiles.role`; the current
  user's role has not been assigned. The persistent check-in writer requires
  a server-only `SUPABASE_SERVICE_ROLE_KEY`.
- Migration `202611180003_caregiver_read_access.sql` is proposed and has not
  been applied to the linked hosted project. Caregiver access against that
  project must not be described as verified.
- The hosted Supabase project has had Security Advisor findings, including
  leaked-password protection being disabled. Do not use this prototype with
  real patient data.

## Current patient and caregiver routes

- `/login` signs in provisioned Auth users and routes by the database profile
  role. Patients without a profile role receive a clear setup message.
- `/patient` uses a session-bound Supabase repository for a patient role and
  the process-local synthetic repository for an unauthenticated/demo session.
  Patient identity is resolved on the server. Check-in writes use the M4
  atomic writer; the server-only service key is required for persistent writes.
- A patient may keep a structured, device-local check-in draft in browser
  localStorage. It is not synchronized or an offline queue.
- `/caregiver` is read-only and returns only check-ins for active, consented
  caregiver links. It does not retrieve patient profiles. The proposed
  migration 003 is required before claiming that policy is live on the hosted
  database.
- `/clinician` lists only patients visible to the role-bound repository.
  Clinicians can review alert evidence and approve a versioned plan. Export
  contains structured check-in data; patient question text and barriers are
  not exported.
- Demo flows are synthetic and process-local. Demo selection is not
  authentication and is not an authorization boundary.

New Arabic UI copy, guardrail patterns, and responses are machine-drafted and
require native-speaker and clinical review.
