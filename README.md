# ONCONOURISH

Future Health, convened by the Department of Health – Abu Dhabi. Founding partners are PureHealth, M42, Institute for Healthier Living Abu Dhabi and Mubadala Bio. Mediclinic is the strategic partner and Burjeel the associate partner.

Co-creators: Microsoft, Inception and MBZUAI.

Prototype needs to translate daily health signals into early, safe, and scalable action. _Clinical decision-support and daily survival tool?: Uses daily symptom check-ins and treatment schedules to recommend safe, tolerable, high-calorie foods in real time._

## Context

In the United Arab Emirates (UAE), over **29,700 people** are living with cancer, with approximately **8,800 new cases** diagnosed annually (WHO GLOBOCAN). Cancer treatments such as chemotherapy, radiation, and surgery place severe metabolic demands on the body, making malnutrition and muscle wasting (cachexia) major risks that can force treatment delays and lower survival rates.

Generic fitness and calorie-tracking apps are built for healthy individuals aiming for weight loss, making them unsuitable—and often unsafe—for oncology patients. This system bridges the gap between clinical oncology care and daily home nutrition by addressing four critical needs:

* **Preventing Treatment Interruptions:** Tracks daily protein, calorie, and fluid intake to catch nutritional deficits early, helping patients maintain the strength needed to stay on their prescribed chemotherapy or radiation schedules.
* **Dynamic Symptom-Based Guidance:** Adapts meal recommendations in real time based on daily treatment side effects (e.g., nausea, mucositis/mouth sores, taste changes, or diarrhea) and strict clinical protocols (such as low-iodine diets for thyroid cancer or low-residue diets for colorectal cancer).
* **Cultural & Religious Localization for the UAE:** Supports regional Emirati, Arab, and South Asian cuisines alongside clinical guidance for **Ramadan fasting** (optimizing *suhoor* and *iftar* hydration and energy when medically cleared).
* **Continuity for a Diverse, Mobile Population:** Provides multilingual support (Arabic, English, Hindi, Urdu, Tagalog) for patients and household caregivers, while maintaining portable, clinician-ready nutritional records for expatriate residents who may travel between the UAE and their home countries during care.


## Full criteria

Six scored areas, with no published weights:

1. Health impact and clinical relevance
2. Technical depth and architecture
3. Working solution and demo quality
4. Responsible AI, safety and data governance
5. Scalability and deployment readiness
6. Commercial viability and path to pilot

## Submission Rules
1. Working Prototype, Technical Documentation, Assumptions and Limitations
2. References

## Real-world struggles patients face

1. Taste shifts. 
2. Food guilt.
3. Conflicting safety rules—rather than acting like a standard calorie tracker.


## Version 0.1
A mobile-first web app (PWA) with a dashboard route, a simple database, rules in code, and the LLM confined to wording and selection from the library.

### Prototype Features

1. Daily "Tolerability Triage": 10-second symptom check-in (e.g., metallic taste, mouth sores, severe nausea, steroid hunger, or neutropenia/low immunity). The system immediately filters out painful or unsafe foods and surfaces 3 zero-prep "safe" options.

2. Chemo-Cycle & Steroid Sync: anticipates predictable shifts, offering bland, cold, or liquid calories during peak nausea days and high-protein, high-volume options during steroid-induced hunger spikes from infusion and steroid schedule.

3. Neutropenic Food Safety Scanner: barcode or ingredient checker powered by a strict clinical rules engine. If a patient is immunocompromised, scanning a food item flags hidden risks like unpasteurized dairy, raw sprouts, or high-bacteria deli items.

4. Guilt-Free "Calories Are Calories" Engine: Instead of penalizing comfort foods, the app calculates protein-to-bite ratios and suggests micro-fortifications (e.g., adding unflavored protein powder or nut butter to ice cream or oatmeal) to prevent muscle wasting (cachexia) without overwhelming the patient.

5. Clinician Signal Dashboard: Exportable summary showing weight trends, hydration logs, and persistent symptom flags. This aligns directly with GITEX's "To Sense is to Predict" theme by alerting oncology dietitians before malnutrition forces a treatment delay.

6. Localization & Accessibility: Supports Native RTL layout support for Arabic, Hindi, English and others (UAE oncology research notes that language barriers between diverse expat patients and clinical staff often limit dietary follow-up outside the hospital). Maps Nutritional Values for local UAE staples, Ramadan and Cultural Mode (optional Ramadan toggle that locks fasting features unless cleared by a clinician, and automatically shifts meal/hydration reminders to non-fasting hours (Iftar to Suhoor).)

7. Caregiver Mode: for multi-generational households in both Abu Dhabi and Nairobi, translating clinical symptoms into simple meal prep tips so family members understand why a patient cannot eat a heavy traditional meal today.


### Technical Architecture


Layer	Recommended Stack	Purpose
Frontend	Flutter or React Native / Next.js	Fast cross-platform mobile or responsive web demo with large, low-fatigue UI buttons.
AI & Personalization	LLM API + Strict Clinical Guardrails	Generates recipe swaps and fortifying tips while a hard-coded rule layer blocks unsafe foods.
Food & Safety Database	OpenFoodFacts API + Custom Oncology Rules	Powers barcode scanning and cross-references ingredients against neutropenic safety guidelines.
Backend & Analytics	Firebase or Supabase	Handles user profiles, treatment timelines, and clinician-ready PDF/CSV exports.


## Standards

## M1 engine foundation

The current implementation milestone adds a minimal Next.js scaffold and a typed, deterministic TypeScript engine. The engine is pure TypeScript and uses synthetic demo data only; food nutrition values, phase windows, and alert thresholds are placeholders that have not been clinically reviewed.

The prototype currently contains 23 food entries, although the build brief refers to 24. M1 ports the entries actually present in `reference/prototype.html` and does not invent an additional food item.

Arabic strings in the ported data and engine—including food labels, barriers, guardrail patterns/responses, and urgent messages—are machine-drafted and require native-speaker and clinical review before use.

The three-day routine engagement flag intentionally differs from the static prototype: it requires the last logged intake before the gap to be below 60%. Exactly 60%, or no logged intake, does not raise the flag.

Pinned toolchain: Node.js 26.13.1, pnpm 12.16.1, Next.js 16.4.6, TypeScript 5.9.3, and Vitest 5.1.1.

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

The patient demo is available at `/login` and `/patient`. It opens the synthetic
Layla scenario at day 9, including the missed-day return flow from the
prototype. Patient interactions use server actions over the in-memory demo
repository; this is a synthetic walkthrough, not an authenticated sign-in flow.
The demo state is temporary and may reset when the server restarts. Clinician
UI, authenticated API routes, and evaluation reporting are not yet implemented.

## M2 persistence and demo setup

The M2 migration is in `supabase/migrations/`; the shared M3/M4 contracts and
current limitations are in `docs/M2_CONTRACTS.md`. All data is synthetic.
Clinical thresholds and food values are placeholders pending review.

Copy `.env.example` to `.env.local` for local configuration. The URL and anon
key are public configuration, not service-role credentials. A Supabase
repository must also receive the signed-in user's access token from the
server-side auth flow; no sign-in screen is implemented yet. Do not put a
service-role key in the browser or commit credentials.

`getRepository` selects demo mode when explicitly requested or when the URL,
anon key, and access token are all absent. Partial configuration or a missing
access token when Supabase is configured raises an error rather than silently
falling back. The in-memory demo repository is shared only within one server
runtime; it is reset on restart and is neither durable nor a security
boundary. It is not suitable for real patient data.

The M3 patient route explicitly selects demo mode and is fixed to the synthetic
Layla record, even if Supabase settings are present. Its server actions are not
an authorization boundary; M4 must replace them with authenticated API routes.
New Arabic UI copy is machine-drafted and requires native-speaker and clinical
review.

To apply the migration, generate synthetic seed data, and run SQL tests, use
**only a dedicated disposable Supabase test project** or a suitable local
Supabase database. Configure `DATABASE_URL` locally without sharing it in chat.
The SQL tests use transactions and roll back their own fixtures; the migration
and seed persist changes.

```sh
PGDATABASE="$DATABASE_URL" psql -v ON_ERROR_STOP=1 -f supabase/migrations/202611180001_m2_persistence.sql
pnpm seed
PGDATABASE="$DATABASE_URL" psql -v ON_ERROR_STOP=1 -f supabase/tests/policies.sql
```

The seed creates synthetic Auth records with no login credentials; demo login
is future work. It uses the 23 foods in M1's actual prototype source, not an
invented 24th item. It is idempotent for its own fixed IDs and does not
overwrite existing records. SQL access tests must run against a database with
Supabase Auth roles and `auth.uid()`; a passing in-memory demo does not verify
RLS. The de-identified measurement view exposes only day-level aggregates with
at least five consenting check-ins; it is not a guarantee of anonymity.
