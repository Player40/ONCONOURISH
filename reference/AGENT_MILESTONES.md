# Agent milestone plan

Use this roadmap to implement ONCONOURISH in small, verifiable handoffs. The full requirements live in [IDE_AGENT_PROMPT.md](./IDE_AGENT_PROMPT.md); shared execution and safety rules live in [agent-prompts/README.md](./agent-prompts/README.md).

## Order of work

| # | Prompt | Requires | Outcome and acceptance gate |
|---|---|---|---|
| 1 | [M1 — Engine and data](./agent-prompts/M1-engine-and-data.md) | — | Pinned toolchain and typed engine; unit tests pass and deviations are recorded |
| 2 | [M2 — Persistence and access control](./agent-prompts/M2-persistence-and-access.md) | M1 | Migrations, RLS, seed data, and demo fallback; shared contracts fixed and SQL policy test status reported |
| 3 | [M3 — Patient experience](./agent-prompts/M3-patient-experience.md) | M2 | Patient flow and English/Arabic RTL work with synthetic data; lapses never reset progress |
| 4 | [M4 — Clinician experience and APIs](./agent-prompts/M4-clinician-and-api.md) | M2 | Clinician alert review, plan approval, and API routes work against shared contracts |
| 5 | [M5 — Safety and evaluation](./agent-prompts/M5-safety-and-evaluation.md) | Combined M3/M4 gate | Measurement and safety views; evaluation runs and the report lists actual results and failures |
| 6 | [M6 — Integration and release docs](./agent-prompts/M6-integration-and-docs.md) | M5 | Project docs and release checks; build, tests, eval, and demo path checked and documented |

## Parallel track: M3 and M4

After M1 and M2, M3 and M4 may run in separate agent sessions or branches from the same baseline. M3 owns the patient UI and its demo entry point; M4 owns the clinician UI and API routes. Both use the shared types, route and repository contracts, and demo state ownership defined in the M2 handoff. Neither branch reads the other's UI state. Agree on ownership before editing shared files or changing a contract.

**Combined gate before M5:** With both tracks integrated, verify that a patient check-in creates an alert visible to the assigned clinician, that the clinician approves a new plan version, and that the patient sees the approved plan. If SQL policy tests could not run, carry that verification gap forward explicitly; a working demo is not evidence that RLS passed.

A new agent should read the shared instructions, the product brief, the assigned milestone prompt, and the current worktree before editing.

## Handoff protocol

At the end of each milestone, the agent should report:

1. What changed, with file paths.
2. Exact validation commands run and their outcomes.
3. Any unmet acceptance checks, known failures, or assumptions.
4. The next milestone's prerequisites or decisions, if any.

Do not claim a test, build, clinical review, deployment, or security property that was not actually verified. Do not commit unless explicitly asked.

## Scope control

- The user-visible demo and safety constraints in the product brief take priority over optional polish.
- If time is limited, cut in the order stated in section 12 of the product brief. Never silently omit a must-have; report it as incomplete.
- The optional LLM wording layer is excluded from these milestones. It may be considered only after M6 and only with explicit approval.
- Do not replace real evaluation with hand-entered percentages. Synthetic cohort outputs must be reproducible and labeled illustrative.
