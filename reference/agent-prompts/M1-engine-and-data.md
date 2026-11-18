# M1 — Port the prototype data and deterministic engine

## Goal

Create a typed, testable foundation that faithfully ports the prototype's data and decision logic. Do not build the app UI or database in this milestone.

## Read

Follow [shared agent instructions](./README.md) and the [product brief sections 3, 4, 8, and 9](../IDE_AGENT_PROMPT.md). Inspect the relevant `<script>` in [prototype.html](../prototype.html) before implementing.

## Scope

- Inspect the repository and current package scripts before scaffolding. Keep existing project conventions where possible.
- Pin compatible exact versions of Node, pnpm, and Next.js (for example, `.node-version`, `packageManager` in `package.json`, and an exact `next` dependency). Include the lockfile and report the versions in the handoff for later agents and CI.
- Add the TypeScript engine under `src/engine/` with no framework or database imports.
- Port and type the source data in `src/data/`: foods, days, symptoms, rules, barriers, guardrails, and scenarios.
- Implement the pure engine functions for phase selection, recommendation/filtering, daily plans, lapse/re-engagement, progress bank, worked-action stats, and alert evaluation.
- Keep phase windows and alert thresholds in data/config. Clearly label placeholder schedules and thresholds.
- Preserve prototype behavior except where the current brief sets a safety rule or records an intentional deviation. Document the three-day engagement flag's intake gate in the handoff for `docs/ASSUMPTIONS.md`: unlike the prototype's gap-only trigger, the app also requires last logged intake below 60%.
- Add focused Vitest coverage for core rule boundaries, red flags, recommendation exclusions with rule IDs, lapse recovery, consent gates, and locale-independent decisions.

## Out of scope

Supabase, API routes, UI, evaluation dashboard/report generation, and all LLM work.

## Acceptance checks

- Engine modules are framework/database independent and have explicit types.
- Every excluded food includes its food ID, rule ID, and reason.
- Recommendation output is at most three items and at most two liquids; each item includes rationale, technique, and limits.
- A lapse never reduces the progress bank; a return after two or more missed days produces the no-blame re-entry path and barrier prompt.
- With a three-day gap and all other prerequisites met, assert that the routine engagement flag fires just below 60%, but not at 60% or with no last logged intake.
- Alert conditions are explainable and testable at configured boundaries.
- Run the focused engine tests and report exact outcomes and prototype differences.
