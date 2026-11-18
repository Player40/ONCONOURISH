# M2 — Supabase persistence and access control

## Goal

Add the database schema, access policies, and synthetic seed data without moving domain rules out of the pure engine.

## Read

Follow [shared agent instructions](./README.md) and the [product brief sections 3, 5, and 9](../IDE_AGENT_PROMPT.md). Inspect the engine contracts created in M1 before designing persistence.

## Scope

- Create Supabase migrations for every table listed in product brief section 5, with appropriate types, foreign keys, constraints, and indexes.
- Enable RLS on every patient-data table and implement patient, caregiver-with-active-link-and-consent, and assigned-clinician access.
- Keep employer and insurer roles absent. Profiles may have only `patient`, `caregiver`, and `clinician`.
- Prevent users from changing ownership or assignment fields to gain access. Make the audit log insert-only.
- Ensure clinicians do not receive free-text or unnecessary identifiers. Implement the de-identified measurement view without IDs.
- Write executable SQL role and policy tests. Run them against local Supabase with Docker, or a suitable test database if available. If neither is available, mark the SQL tests **not run**, give the command to run them, and state what remains unverified. Static checks do not count as a passing RLS test.
- Add a seed script for synthetic Layla, Omar, Priya, and the 24 placeholder food items from the prototype/brief.
- Implement a clearly separated in-memory demo repository for missing Supabase configuration. The fallback must be labeled as demo-only and must not masquerade as durable or secure persistence.
- Add `.env.example` with variable names and empty/sample placeholders only.
- Record the shared contracts for M3 and M4 before their branches split: engine and repository types, route request/response shapes and authorization expectations, and ownership and lifetime of demo state. Both views must use the same demo repository state rather than keeping separate copies in UI state.

## Out of scope

Patient/clinician UI, API behavior, deployment, and real patient data.

## Acceptance checks

- Report whether migrations were applied and SQL tests were run. Do not call either verified if it was only inspected.
- SQL tests cover the exact allowed roles, caregiver consent/link requirements, clinician assignment boundaries, and ID-free measurement output.
- Synthetic data is deterministic and visibly marked as synthetic/placeholders.
- No secret is added. Demo fallback behavior and limitations are documented.
- Report any RLS policy that could not be exercised against a real database; do not claim live policy verification without running it.
