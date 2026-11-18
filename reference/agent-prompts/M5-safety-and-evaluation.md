# M5 — Safety surfaces and evaluation harness

## Goal

Make safety rules inspectable and produce honest, reproducible evaluation evidence from the implemented engine.

## Read

Follow [shared agent instructions](./README.md) and [product brief sections 2, 4, 8, and 11](../IDE_AGENT_PROMPT.md). Use actual engine behavior and repository test setup; never hard-code a passing report.

Start only after the [combined M3/M4 gate](../AGENT_MILESTONES.md#parallel-track-m3-and-m4) has been verified.

## Scope

- Implement the safety route with rule registry, guardrail tester, "The app will never" boundaries, and the latest evaluation report.
- Implement a deterministic synthetic cohort generator using seed `2026`, 40 users, and 42 days. Build the measurement view for persistence, retention, recovery after lapses, and language equity.
- Label the cohort and all resulting metrics as synthetic/illustrative, not evidence of clinical effectiveness.
- Add `pnpm eval` to run the complete specified evaluation set and write `docs/EVAL_REPORT.md` with counts, pass rates, and every failure.
- Cover alert boundaries; food filters and rule IDs; lapse ladder and consent; Ramadan gate; permissions; red-team inputs including English/Arabic where applicable and obfuscated variants; locale parity.
- Add CI workflow coverage for tests and evaluation, consistent with the repository's existing CI setup.
- Include no unsupported effect-size comparisons or fabricated baseline numbers. Calculate displayed metrics from reproducible generated data.
- Ensure Arabic guardrail patterns exist for the required categories and document native/clinical review needs.

## Out of scope

LLM integration, real patient data, claims of clinical validation, and decorative metric polish unsupported by the generator.

## Acceptance checks

- Evaluation runs locally through `pnpm eval`; the generated report matches that run and lists failures honestly.
- The specified scenario categories are covered; missing or failing Arabic cases are reported rather than hidden.
- Locale changes do not change clinical engine decisions for identical inputs.
- Synthetic measurement is reproducible and clearly labeled.
- CI runs the focused test/evaluation commands.
