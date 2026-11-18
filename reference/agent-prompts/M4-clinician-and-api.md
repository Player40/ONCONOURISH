# M4 — Clinician workflow and API routes

## Goal

Connect patient signals to a restricted clinician review workflow and return approved plans to the patient.

## Read

Follow [shared agent instructions](./README.md) and [product brief sections 4, 5, and 6](../IDE_AGENT_PROMPT.md). Start from the completed M1/M2 baseline. Reuse the engine and repository/security boundaries; do not depend on M3's UI state or create a second rules implementation.

## Scope

- Implement the clinician route with assigned synthetic patients, status tags, alert evidence and source days, trends, symptom history, intervention note, and plan approval.
- Own clinician UI and API routes; M3 owns patient UI and its demo entry point. Follow the agreed M2 route and repository contracts.
- Approval creates a new plan version with approver/time in the shared repository so the patient view can read it. Do not imply clinician approval before the explicit action.
- Implement API routes from the brief: check-in, ask, plan approval, Ramadan request, and patient export.
- Check-in processing runs deterministic engine rules, persists the result, opens/updates alerts, and writes audit events through the repository layer.
- Ask processing runs guardrails before any in-scope templated response. Red flags and urgent symptoms never reach a model.
- Export only authorized patient summaries. Provide CSV and printable HTML; protect the route with the same access checks as the clinician view.
- Keep free-text access restricted. Do not expose it in clinician responses or exports unless the brief explicitly permits it.
- Include the Ramadan clearance inbox and enforce clinician-only clearance.

## Out of scope

LLM provider, PDF export, FHIR/external integrations, and real notifications.

## Acceptance checks

- A patient check-in can create explainable alert evidence and appear for an assigned clinician.
- An unassigned clinician and unauthorized caregiver cannot access the patient data through UI or API paths.
- Approval increments the plan version. After integrating M3, verify that the patient sees it as part of the [combined M3/M4 gate](../AGENT_MILESTONES.md#parallel-track-m3-and-m4) before M5.
- Ramadan remains unavailable until a clinician clears the request.
- Red flags trigger urgent messaging with no food advice/model call.
- Run route, policy, and UI tests plus build/typecheck; record any integration path not exercised.
