# Seven-minute synthetic demo

Use the local app with `NEXT_PUBLIC_DEMO=true` and synthetic data only. The
demo repository is process-local, so keep the same running server process for
the patient-to-clinician loop. Do not use real patient information.

1. **Open the patient journey** (`/login` → **Open Layla's synthetic demo**).
   Start on cycle day 9. Point out the three missed days, preserved progress,
   and “Welcome back. No catching up needed.”
2. **Choose a barrier.** Select a barrier chip. Show that the response shrinks
   the plan without blame and that caregiver/WhatsApp messages are not sent.
3. **Record the day-9 check-in.** Edit and save the existing synthetic
   check-in. The deterministic engine evaluates the accumulated evidence and
   writes the alert in demo memory. Show the explanation and food filters;
   note that all values and thresholds are placeholders.
4. **Review as a clinician** (return to `/login` → **Open synthetic clinician
   demo**). Select Layla and inspect alert evidence, including values and
   source days. Mark it reviewed if desired.
5. **Approve a plan.** Select one or more actions and submit the adjusted plan.
   The dashboard should report a new approved version.
6. **Confirm the patient sees it.** Use **Patient demo** from the clinician
   dashboard. The approved-plan banner should show the clinician's version.
7. **Show measurement and safety** (`/measurement`, then `/safety`). Explain
   that cohort charts are generated synthetic metrics and that the safety page
   exposes deterministic rules, guardrails, and the latest test report.

If the clinician does not show the new alert or the patient's approved plan,
stop and report the failure; do not describe the flow as verified. This demo
does not validate Supabase sign-in, RLS, clinical outcomes, or deployment
readiness.
