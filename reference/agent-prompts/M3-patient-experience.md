# M3 — Patient experience and recovery loop

## Goal

Build the patient-facing experience around the prototype's interaction model, with the no-blame lapse loop and autonomy controls working end to end in demo mode.

## Read

Follow [shared agent instructions](./README.md) and [product brief sections 1, 2, 4, and 6](../IDE_AGENT_PROMPT.md). Start from the completed M1/M2 baseline and read the shared contracts in the M2 handoff before editing.

## Scope

- Implement the patient route and demo login entry point using the project's existing framework and components.
- Own patient UI and its demo entry point; M4 owns clinician UI and API routes. Build against the agreed interfaces without depending on M4's UI state. Use contract-shaped fixtures for API responses if needed while M4 is in progress.
- Port the prototype's patient screens, wording, and interactions; do not redesign them.
- Include cycle/phase context, check-in (symptoms, appetite, intake proxy, optional weight, urgent flags), plan actions, safe recommendations, "Why this?" details, progress bank, and worked-action stats.
- Implement no-blame return after a lapse, barrier selection, smaller plan when required, and WhatsApp offer only when enabled. WhatsApp must not send messages.
- Include controls for care-team sharing, caregiver access, notification consent, and Ramadan request. Fasting remains locked unless clinician-cleared; patients can only request clearance.
- Add English/Arabic toggle and RTL layout for Arabic patient screens. Mark machine-drafted Arabic for native and clinical review in documentation.
- Use the M2 demo repository when backend configuration is unavailable. Keep UI state and domain decisions behind engine/repository interfaces rather than duplicating rules in components.
- Include accessible labels, keyboard focus, touch targets, and responsive mobile typography.

## Out of scope

Clinician dashboard, live messaging, LLM wording, and production deployment.

## Acceptance checks

- A demo user can check in, see filtered recommendations and rationale, complete actions, and return after missed days without losing progress.
- Urgent symptoms show an urgent path and no food recommendation.
- The patient can see/change available controls; consent-dependent features remain gated.
- English and Arabic patient screens render in correct LTR/RTL direction.
- Run the relevant tests and build/typecheck. Manually verify the core demo flow if a browser is available and report exactly what was checked.
- Once both tracks are integrated, verify the [combined M3/M4 gate](../AGENT_MILESTONES.md#parallel-track-m3-and-m4) before M5. Standalone fixtures do not satisfy that gate.
