# ONCONOURISH: BUILD BRIEF FOR THE IDE AGENT

You are building the working prototype for a hackathon entry. Read this whole brief before writing code. Work in milestones, run tests at each one, and report real results only.

## 0. Setup before you start

1. Put the clickable prototype file at `reference/prototype.html` (it is the `index.html` from our GitHub Pages repo). Open it and read its `<script>`. It is the **source of truth for UX and for the rule logic**. Port data and rules from it faithfully: `FOODS`, `DAYS`, `SYM`, `RED`, `BARR`, `GUARD`, `recommend()`, `alertFor()`, `phaseOf()`, `planItems()`, `worked()`, `meas()`.
2. Do not redesign the UX. Match its screens, wording and behaviour, then improve structure, types and persistence.
3. Before coding, output a short plan and a file tree. Then proceed.

## 1. What this is

**Product:** OncoNourish, a behaviour-first nutrition companion for people in cancer treatment, with a dietitian safety net.
**Competition:** Future Health Digital Innovation Challenge (Abu Dhabi), Challenge 09 "Sustaining Healthy Behaviors". Submission is due **Friday 20 November 2026**. We have about two days.
**Judging areas (no published weights):** health impact and clinical relevance; technical depth and architecture; working solution and demo; Responsible AI, safety and governance; scalability and deployment readiness; commercial viability and path to pilot.
**The brief's five requirements, which the product must visibly satisfy:**
1. Adaptive personal plans: small, achievable actions from goals, preferences, health context.
2. Continuous learning and re-engagement: detect a lapse, identify the barrier, adjust plan or channel without blame, never reset progress to zero.
3. Evidence-based behaviour support with the rationale **and limits** of each technique visible.
4. User autonomy and inclusion: control over goals, data and notifications; Arabic and English; no manipulative engagement; no punitive use by employers or insurers.
5. Sustained outcome measurement: persistence, recovery after lapses, retention, equity. Not downloads or messages.

**Target behaviour:** eating and drinking enough through treatment. Nutrition here is **supportive care**. It never claims to treat cancer.

## 2. Hard constraints (never violate)

- **Synthetic data only.** No real patient data anywhere. Say so in the UI footer and README.
- **No medical claims you cannot cite.** Use only the approved claims in section 11. Anything clinical that is not sourced is labelled `PLACEHOLDER: pending dietitian review`.
- **Rules before model.** Safety, food filtering, alerts and escalation are deterministic code. A language model, if enabled at all, only rewords or selects from the vetted library.
- **Red flags and urgent symptoms never go to a model** and never produce food advice. They show the urgent message.
- **No role exists for employers or insurers** in the schema or code. This is a deliberate design point. Add a test that asserts the allowed roles are exactly `patient`, `caregiver`, `clinician`.
- **Never reset progress after a missed day.** The progress bank only increases.
- **Do not fabricate results.** Evaluation numbers must come from actually running the tests. If something fails, record it as a failure in the report.
- Mark every machine-drafted Arabic string as needing native and clinical review (in docs, not in the UI).
- No secrets in the repo. Provide `.env.example`.

## 3. Stack and architecture

- **Next.js (App Router) + TypeScript**, one app serving patient and clinician by role. Tailwind is fine. PWA manifest and offline-safe check-in draft (localStorage) are enough; skip service-worker complexity.
- **Supabase**: Postgres, Auth, Row Level Security. Provide migrations in `supabase/migrations` and a seed script.
- **Core engine** in `src/engine/`: pure TypeScript, **no framework or database imports**, fully unit-tested with Vitest.
- **Optional LLM wording layer** behind `LLM_ENABLED=false` (default off). Provider-agnostic interface. See section 7.
- **Deploy** to Vercel (or similar). Provide a working `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm seed`.
- **Demo mode** (`NEXT_PUBLIC_DEMO=true`): shows the "Demo day" pill bar from the prototype so a judge can step through Layla's 14 days, plus demo login buttons for the seeded users. If Supabase env vars are missing, fall back to in-memory seed data so the app still runs for a demo. Say so in the README.

Suggested layout:
```
reference/prototype.html
src/engine/        # pure logic: types, phases, rules, food filter, alerts, lapse, guardrails, wording
src/engine/__tests__/
src/data/          # foods.ts, rules.ts, barriers.ts, scenarios.ts  (typed, ported from prototype)
src/app/           # routes
src/lib/           # supabase client, auth, repositories
src/i18n/          # en.json, ar.json, RTL handling
supabase/migrations/, supabase/seed.ts
docs/              # ARCHITECTURE.md SAFETY.md LIMITATIONS.md ASSUMPTIONS.md EVAL_REPORT.md DEMO_SCRIPT.md
```

## 4. Domain logic (port from the prototype, keep behaviour identical)

Implement as pure functions with explicit types.

- **Phase by cycle day** (placeholder schedule, clinician-configurable per regimen later): days 1 to 3 steroid window, 4 to 6 peak nausea, 7 to 12 low-immunity window, 13+ recovery. Store phase windows as data, not hard-coded branches.
- **Symptoms:** `nausea`, `nausea_severe`, `metallic`, `mouth_sores`, `steroid_hunger`, `low_immunity`, `fatigue`. **Red flags:** `red_fluids` (cannot keep fluids down for 24 h), `red_fever` (fever or chills).
- **Food filter rules (IDs fixed):**
  - `FS-01`: with low immunity (reported or in the low-immunity window), hide foods with a `fsRisk` (undercooked egg, unpasteurised dairy, raw sprouts, deli meat). This is standard safe-food-handling, **not** a strict neutropenic diet. State that in the rule text.
  - `TX-01` mouth sores: hide acidic, spicy, crunchy, solid-texture.
  - `TX-02` severe nausea: only cold or room-temperature, low-smell, non-greasy, non-solid.
  - `TX-03` nausea: hide greasy. `TX-04` metallic taste: hide red meat. `TX-05` steroid hunger: prefer high-volume, higher-protein. `TX-06` appetite 1 to 2: prefer calorie-dense, easy foods.
  - Each excluded food returns `{foodId, ruleId, reason}` so the UI can show "Filtered out today".
- **Ranking:** port the scoring from `recommend()`. Return the top 3, at most 2 liquids. Every pick returns reasons for the "Why this?" panel plus technique and limit text.
- **Daily micro-plan:** three small actions (fortified drink by 10:00, small snack every 2 to 3 hours, sip fluids hourly). If a lapse of 2+ days just ended or the user chose a barrier, **shrink to one action**.
- **Lapse detector and re-engagement ladder:** missed run 1 = gentle nudge; 2 = shrink goal and offer WhatsApp **only if the user enabled it**; 3 = routine flag to the clinician (summary only) when the last logged intake was below 60%. Caregiver contact only with explicit consent. On return after 2+ missed days: "Welcome back, no catching up needed" plus the barrier question.
- **Barriers and responses:** port `BARR` (nausea, taste, tired, cost, forgot, guilt) with technique labels. Labels follow the BCT Taxonomy style and need behavioural-scientist review (docs).
- **Progress bank:** count of check-ins, never decreases. **"What has worked for you":** per action type, completed over offered, shown as simple explainable stats. No black-box learning.
- **Alert engine (explainable, placeholder thresholds):** fires only when **all** hold: (a) mean intake over the last 3 logged days is below 60% of target; (b) weight down 2.0% or more from baseline; (c) the same symptom (excluding steroid hunger) on 3 or more of the last 7 check-ins. "Watch" when exactly 2 hold. Store `evidence` JSON with each condition's value and source days. Thresholds live in config and are labelled placeholders.
- **Intake capture (real app):** the patient answers "How much of your usual eating did you manage today?" with 25 / 50 / 75 / 100 percent. This is a self-reported proxy. Say so in LIMITATIONS.
- **Ramadan gate:** off by default. Patient can only request. Fasting features and iftar-to-suhoor reminder timing unlock only after a clinician clears the request. Never give fasting advice.
- **Guardrails (run first on every free-text input):** port `GUARD` with IDs `G-INJ, G-URG, G-STOP, G-CURE, G-SUPP, G-FAST, G-DX` and their canned responses, in that order. **Add Arabic patterns** for the same categories (stop treatment, urgent symptoms, cure claims, supplement doses, fasting) and flag them for native review. In-scope questions return a templated answer from the food engine.

## 5. Data model (Postgres, RLS on everything)

Create migrations for these tables with sensible types, FKs and indexes:
`profiles(id, role in ('patient','caregiver','clinician'), display_name, locale)`,
`patients(id, user_id, clinician_id, pseudonym, dx, regimen, cycle_start, baseline_weight_kg, targets jsonb, likes text[], budget, locale)`,
`consents(patient_id, purpose in ('share_with_care_team','caregiver_access','whatsapp_reminders'), granted, updated_at)`,
`caregiver_links(patient_id, caregiver_user_id, active)`,
`checkins(patient_id, day, symptoms text[], red_flags text[], appetite 1..5, intake_pct, weight_kg, unique(patient_id, day))`,
`barrier_events(patient_id, day, barrier, response_id)`,
`actions_offered(patient_id, day, action_type, done)`,
`plans(patient_id, version, items jsonb, note, status, approved_by, approved_at)`,
`alerts(patient_id, kind in ('nutrition_decline','engagement_drop','red_flag'), severity, state in ('open','reviewed'), evidence jsonb, created_at, reviewed_by, reviewed_at)`,
`ramadan_requests(patient_id, status in ('pending','cleared','declined'), decided_by, decided_at)`,
`food_items(id, name_en, name_ar, serving, kcal, protein_g, temp, texture, tags text[], cost, fs_risk, source, reviewed_by, reviewed_at, placeholder bool default true)`,
`rules(id, version, text, owner, status default 'placeholder', reviewed_by, reviewed_at)`,
`audit_log(id, at, actor, patient_id, event, payload jsonb)` (insert-only).

**RLS policies:** a patient reads and writes only their own rows. A caregiver reads a patient's check-ins only if an active link **and** the `caregiver_access` consent exist. A clinician reads only assigned patients. Clinicians cannot read free-text beyond the summary. Measurement uses a **de-identified view** with no ids. Add policy tests.

## 6. Screens and routes

- `/login`: demo account buttons (patient Layla, clinician) plus normal auth.
- `/patient`: header with language toggle (EN / عربي, full RTL), cycle chip, phase chip, optional approved-plan banner, urgent card path, check-in card (symptom chips, appetite 1 to 5, intake 25/50/75/100, optional weight, urgent chips), welcome-back card with barrier chips, today's small steps with checkboxes, safe options with expandable "Why this?" (rules, technique, limit), fortify tip, progress bank and "what has worked", "Your controls" (share with care team, caregiver access, WhatsApp reminders toggle that is stored but sends nothing, Ramadan request), free-text "Ask a question" box that runs guardrails. Footer: not medical advice, synthetic data.
- `/clinician`: patient list with status tags; patient detail with alert card showing each condition's value and sources, weight chart, intake chart, symptom grid with missed days hatched, intervention checkboxes plus note, **Approve adjusted plan** (writes a new plan version, flows back to the patient), **Export summary** (CSV download and a printable HTML summary), Ramadan clearance inbox.
- `/measurement`: synthetic 40-user six-week cohort from a seeded generator, showing persistence by week, retention, recovery-after-lapse histogram, and an equity table by language. Banner: "Synthetic data from this prototype; illustrates the metrics, not evidence."
- `/safety`: guardrail tester, the rule registry (IDs, text, status, owner), "The app will never" list, and the latest evaluation summary read from `docs/EVAL_REPORT.md` output.
- `/about`: scope, limitations, evidence base with the approved claims and links, data and privacy statement.
- API routes: `POST /api/checkin` (runs the engine, persists, opens or updates alerts, writes audit), `POST /api/ask`, `POST /api/plan/approve`, `POST /api/ramadan`, `GET /api/export/[patientId]`.

Accessibility: keyboard focus states, labels on all controls, contrast in light and dark, 16px+ base text on mobile, large tap targets.

## 7. Optional LLM wording layer (build last, default OFF)

```ts
interface WordingProvider {
  reword(input: { locale: 'en'|'ar'; foodIds: string[]; actionIds: string[]; barrierId?: string; tone: 'gentle' }): Promise<{ messages: string[] }>;
}
```
- Default `TemplateProvider` returns deterministic text. `LlmProvider` is used only if `LLM_ENABLED=true`.
- Send **only IDs and locale**. Never names, free text or health identifiers.
- Output must be schema-validated, may only reference allowed IDs and numbers, and must pass a **validator** that blocks cure, dose and diagnosis language and re-runs the guardrails. On any failure, fall back to templates and log to `audit_log`.
- Log every call (inputs as IDs, accepted or rejected) in `audit_log`.

## 8. Evaluation harness (this is our evidence, so make it real)

Create `src/engine/__tests__/` and a script `pnpm eval` that runs everything and writes `docs/EVAL_REPORT.md` with counts, pass rates and every failure listed. Cover at least 30 scenarios:

- **Alert boundaries (8):** intake 59 vs 60; weight loss 1.9 vs 2.0 percent; symptom on 2 vs 3 of last 7; fewer than 3 logged days; missing weight; all three met; exactly two met (watch); steroid hunger excluded from persistence.
- **Food filter (7):** one test per rule `FS-01, TX-01..TX-05` plus a combined case; every excluded food reports a rule ID.
- **Lapse ladder (4):** gaps of 1, 2, 3 days; caregiver contact blocked without consent; WhatsApp offered only if enabled; progress bank never decreases.
- **Ramadan gate (3):** locked by default; stays locked while pending; unlocks only after clinician clearance.
- **Permissions (4):** caregiver blocked without consent; clinician limited to assigned patients; no employer or insurer role exists; de-identified view exposes no ids.
- **Red team (at least 12):** stop-chemo, cure claims, supplement doses, prompt injection, diagnosis or prognosis, urgent symptoms, fasting questions, each in English and in Arabic where applicable, plus obfuscated variants.
- **Parity (1+):** identical clinical inputs produce identical engine decisions regardless of locale.

**Report honestly.** If Arabic red-team cases fail, list them as failures, fix what you can, and leave the rest documented under limitations. The suite must run in CI (add a GitHub Actions workflow).

## 9. Seed data

- **Layla M., 52:** breast cancer, AC-T chemotherapy cycle 2, baseline 68.0 kg, likes laban, dates, khichdi, rice pudding, low-to-medium budget. Her 14-day course is the `DAYS` array from the prototype, including missed days 6 to 8. Use `intake_pct` values from the prototype.
- **Omar K., 68** (colorectal, stable) and **Priya S., 45** (lung, watch): small plausible courses so the list view is real.
- **Food library:** all 24 foods from the prototype in `food_items`, `placeholder=true`.
- **Cohort generator:** seeded (seed 2026), 40 users, 42 days, same model as `meas()`.

## 10. Documents to generate (concise, factual, no hype)

`ARCHITECTURE.md` (layers, data flow, diagram in Mermaid), `SAFETY.md` (rule registry, guardrails, escalation paths, what the model may and may not do), `LIMITATIONS.md` (placeholder thresholds and nutrient values, self-reported intake proxy, one regimen schedule, no clinical validation, synthetic data, machine-drafted Arabic, limited guardrail coverage), `ASSUMPTIONS.md`, `EVAL_REPORT.md` (generated), `DEMO_SCRIPT.md` (the 7-minute path: Day 9 return after lapse, barrier tap, clinician alert evidence, approve plan, patient sees it, measurement page, safety tester), `README.md` (run, seed, demo mode, env vars).
State plainly what was built during the challenge and what is roadmap (WhatsApp sending, FHIR and health-exchange integration, wearables, lab upload, barcode scanner, additional languages).

## 11. Approved claims (use only these, with their sources)

- Malnutrition affects roughly 20% to over 70% of cancer patients depending on setting, and an estimated 10 to 20% of cancer deaths are attributable to malnutrition rather than the malignancy (ESPEN expert group recommendations, 2017).
- Malnutrition is associated with lower chemotherapy tolerance, more infections and higher mortality (observational; same source).
- Nutritional counselling during chemotherapy has been found feasible and safe with preliminary benefit, from small early-phase trials (Curr Oncol 2024 systematic review, PMC11764068).
- A meta-analysis found no evidence that neutropenic diets reduce infection and advised standard safe food-handling (Mayo Clinic Proceedings, 2019).
- UAE, GLOBOCAN 2024: 8,815 new cancer cases, 3,814 deaths, 29,704 five-year prevalent cases.
- Not claimed: that this app prevents treatment interruptions, improves survival, or that any diet treats cancer.

## 12. Working method and time-box

1. **M1 (tonight):** scaffold, ported data and engine with unit tests, `pnpm test` green.
2. **M2:** migrations, RLS, seed, repositories, demo-mode fallback.
3. **M3:** patient app complete with i18n and RTL.
4. **M4:** clinician dashboard, approval flow, export.
5. **M5:** measurement, safety and about pages; `pnpm eval` and `EVAL_REPORT.md`.
6. **M6:** docs, deployment, polish, demo script.
7. Optional: LLM wording layer.

After each milestone: run tests and build, commit with a clear message, and print a short status. If you are behind, **cut in this order**: LLM layer, PDF export (keep CSV), Arabic beyond the patient screens, measurement page polish. **Never cut:** the engine with tests, the patient loop with lapse recovery, the clinician alert and approval flow, RLS, the evaluation report, the limitations document.

## 13. Definition of done

- [ ] `pnpm build`, `pnpm test`, `pnpm eval` all succeed; failures are documented, not hidden.
- [ ] A judge can open the deployed URL, press a demo login, step through Layla's days, and see the full loop end to end.
- [ ] Every brief requirement (section 1) is visible in the UI, and the "Why this?" panels show technique and limit.
- [ ] Urgent path shows no food advice and no model call.
- [ ] Docs written; placeholders and limitations stated plainly; no unsourced clinical claim anywhere.
- [ ] Repo contains no secrets and no real personal data.

Start by outputting your plan and file tree.
