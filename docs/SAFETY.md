# Safety

This prototype uses synthetic records only. Its rules and thresholds are
placeholders, not clinically validated recommendations. Do not use it to make
care decisions or enter real patient information.

## Deterministic controls

- Food filters are applied by the engine before any options are shown.
  `FS-01` represents standard safe-food handling and is not a strict
  neutropenic diet. `TX-01` through `TX-06` filter or rank foods by the
  selected symptoms and appetite. All are pending dietitian review.
- Nutrition alerts use three placeholder conditions: mean intake below 60%
  across the last three logged check-ins, weight loss of at least 2% from
  baseline, and one non-steroid-hunger symptom in at least three of the last
  seven logged check-ins. All three are needed for an alert; two produce
  “watch.”
- Lapse support is non-punitive. One missed day can show a nudge; two or more
  shrink the illustrative plan. A routine clinician flag additionally
  requires the last logged intake to be below 60%. No notification is sent.
- The Ramadan flow is locked by default. A patient may request review; only a
  clinician can record clearance. The prototype does not provide fasting
  instructions.
- Urgent flags show a care-team/emergency escalation message and suppress food
  recommendations for that check-in.

## Guardrails and language

Questions are checked by ordered deterministic patterns:
`G-INJ`, `G-URG`, `G-STOP`, `G-CURE`, `G-SUPP`, `G-FAST`, and `G-DX`.
In-scope questions receive a fixed template and engine options; the patient
interface does not save or send the question text. Coverage is finite and
cannot identify every unsafe phrasing or context.

No language model is integrated or called. It cannot make safety decisions,
generate recommendations, or receive patient text. The optional LLM wording
layer in the product brief is out of scope.

Arabic patterns, responses, and patient copy are machine-drafted. A native
Arabic speaker and clinical reviewer must review them before any use beyond
this synthetic prototype.

## Access and data handling

- Only `patient`, `caregiver`, and `clinician` are application roles.
- Roles are provisioned in `profiles`; users cannot select a role at sign-in.
- Supabase RLS is the authorization authority. Client-supplied IDs do not
  grant access. The service-role check-in writer rechecks patient ownership.
- Caregiver access requires both an active link and patient consent. Migration
  `202611180003_caregiver_read_access.sql` remains unapplied to the linked
  hosted project, so that hosted caregiver policy is not verified.
- Patient questions are not persisted. Barriers use fixed IDs. Clinician plan
  notes are clinician-authored and are not included in exports.
- The localStorage draft stays in the browser until saved or canceled; it is
  not encrypted or synchronized by this app. Use synthetic values only.
- WhatsApp preference is stored as a setting only; no message is sent.

## What this does not establish

Passing tests show only that selected deterministic cases behave as asserted.
They do not establish clinical validity, comprehensive guardrail coverage,
privacy certification, deployment security, accessibility conformance, or
effectiveness.
