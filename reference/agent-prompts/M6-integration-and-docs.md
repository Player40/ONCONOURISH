# M6 — Integration, documentation, and release readiness

## Goal

Close the remaining integration gaps, document the actual system and its limits, and verify a judge-ready demo path without overstating readiness.

## Read

Follow [shared agent instructions](./README.md), the complete [product brief](../IDE_AGENT_PROMPT.md), and the M1–M5 handoff reports. Start with the full worktree and run current checks before changing code.

## Scope

- Add or complete the login/demo entry, about page, PWA manifest, and offline-safe check-in draft where missing. Do not add service-worker complexity.
- Verify demo-mode behavior with and without Supabase environment variables; show a clear demo-only fallback state.
- Complete the required factual docs: `ARCHITECTURE.md`, `SAFETY.md`, `LIMITATIONS.md`, `ASSUMPTIONS.md`, `DEMO_SCRIPT.md`, and README run/seed/demo/env instructions. Preserve the generated `EVAL_REPORT.md`; do not hand-edit results to appear better.
- Ensure docs distinguish built functionality from roadmap items, including WhatsApp sending, FHIR/health-exchange, wearables, lab upload, barcode scanning, and additional languages.
- Review visible clinical statements against the approved claims and citations in section 11. Remove unsupported claims or label them as pending dietitian review.
- Add remaining CI/build/seed scripts required by the brief. Verify `pnpm build`, `pnpm test`, `pnpm eval`, and seed command where the environment permits.
- Run the seven-minute demo path: return after lapse, choose barrier, show clinician alert evidence, approve plan, confirm patient sees it, show measurement and safety tester.
- Fix only integration defects necessary for the defined flow. Keep the optional LLM off and out of scope.

## Acceptance checks

- Required run commands and environment variables are documented and match package scripts.
- Docs accurately describe actual architecture, policies, limitations, and evaluation results.
- The demo path works with synthetic data; failures and unavailable external services are explicit.
- Final validation results are reported with exact commands. Do not claim deployed, production-secure, clinically validated, or fully accessible unless that was verified.
