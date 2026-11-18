# Shared instructions for milestone agents

These rules apply to every milestone prompt in this folder.

## Read first

1. [Product and build brief](../IDE_AGENT_PROMPT.md).
2. [Milestone roadmap](../AGENT_MILESTONES.md).
3. The current repository state, including existing files and `git status`.
4. [prototype.html](../prototype.html) for UX, seeded data, and existing rule behavior.

[AgentPrompt_legacy.md](../../AgentPrompt_legacy.md) is historical and must not override the current product brief. Do not assume the repository is empty or replace existing work without understanding it.

## Required working behavior

- Implement only the assigned milestone. Avoid opportunistic refactors and unrelated fixes.
- Preserve prototype behavior except where the brief explicitly requires a safety or privacy correction or records an intentional deviation. Record those differences in the handoff.
- Use synthetic data only. Do not add real patient information, secrets, or credentials. Keep secrets out of source control and provide placeholders only in `.env.example`.
- Safety rules, food filtering, urgent escalation, and free-text guardrails are deterministic. Do not send red flags or urgent symptoms to a model.
- Do not invent clinical claims, validation, evaluation results, or approval. Mark unsupported clinical content `PLACEHOLDER: pending dietitian review`.
- Never reset progress after a missed day. Keep user consent explicit and do not add employer or insurer roles or access.
- Keep the core engine pure TypeScript with no framework or database imports.
- Keep machine-drafted Arabic marked for native and clinical review in documentation.
- Prefer existing project conventions and dependencies. Do not install dependencies unless a manifest changed or validation reports a missing package.
- Do not commit unless the user explicitly asks.

## Verification and report

Run the smallest existing checks that cover your changes. State the exact command and result. If a check cannot run, explain why; do not imply success. End with changed paths, checks, remaining risks, and a concise handoff to the next milestone.

When prototype behavior conflicts with an explicit safety or privacy constraint in the current brief, follow the constraint, explain the difference, and add a focused test if applicable. Otherwise maintain prototype parity apart from the intentional deviations documented in the brief.
