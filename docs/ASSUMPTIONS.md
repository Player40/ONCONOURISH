# Assumptions

- Every record and test account is synthetic. Pseudonyms and diagnoses in the
  demo are fictional fixtures, not de-identified real records.
- Cycle day is a selected position in a fixed 14-day fixture, not a date
  derived from a patient's actual treatment schedule. The authenticated
  workspace also opens at day 9 by default.
- A profile role is assigned by a project administrator. A patient session
  must resolve to exactly one RLS-visible patient record.
- Clinician visibility is determined by the session-bound repository and
  database policies. Caregiver visibility additionally requires an active
  link and current patient consent; application text alone is not an access
  control.
- Intake percent is a self-reported proxy for usual intake. Placeholder alert
  thresholds are examples for explaining the review loop, not clinical
  escalation standards.
- Demo data is mutable only within a server process. A restart, deployment
  topology, or request to another process can produce a fresh state.
- Supabase persistence assumes the required schema migrations, Auth profiles,
  RLS policies, and server-only check-in writer are configured. The caregiver
  policy migration is proposed and has not been applied to the linked hosted
  project.
- A device-local draft contains only structured synthetic check-in fields and
  is not a substitute for server persistence or an offline queue.
- No model call, external notification, health-exchange connection, or
  third-party analytics is part of the current application flow.
