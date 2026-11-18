# ONCONOURISH

OncoNourish is a synthetic-data prototype for supportive eating and drinking
behavior during cancer treatment. It demonstrates patient check-ins, fixed
deterministic food filters, lapse recovery, caregiver consent, clinician review,
and synthetic cohort measurements. It is not a medical device or a clinically
validated service.

**Use synthetic data only. Do not enter real patient information.**

## Run locally

Use the pinned Node.js and pnpm versions shown in `.nvmrc` and
`package.json`.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000/login](http://localhost:3000/login). The default
environment enables synthetic demos. When both Supabase public settings are
absent—or `NEXT_PUBLIC_DEMO=true`—demo entry remains available; the patient demo is explicitly labeled
and uses process-local in-memory data. That state is not durable and may reset
on restart or when requests reach another server process.

## Demo routes

- `/login`: synthetic demo entry or sign-in for administrator-provisioned
  Supabase Auth users.
- `/patient`: Layla's synthetic 14-day walkthrough, including the day-9 return
  after missed check-ins. Patient check-in drafts are stored only in this
  browser until saved; drafts are not synchronized.
- `/clinician`: synthetic clinician review, alert evidence, and plan approval.
- `/caregiver`: read-only view of check-ins only when an active link and patient
  consent both permit access.
- `/measurement` and `/safety`: illustrative cohort metrics and deterministic
  guardrail tester.
- `/about` and `/limitations`: scope, evidence context, and limitations.

For the end-to-end demo, see [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).

## Supabase configuration

Copy `.env.example` to `.env.local` and set:

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_DEMO` | Enables the synthetic demo entry. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase key used by the server-side session-bound repository. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key required by the atomic persistent check-in writer. Never expose it to client code or commit it. |

Sign-in requires an existing Auth user with a corresponding `public.profiles`
row and assigned role. Users cannot select their own role. A successful
Supabase login routes to the workspace for that role. A missing role is shown
as an explicit setup error.

The authenticated patient check-in writer requires the server-only
`SUPABASE_SERVICE_ROLE_KEY` and the reviewed M4 migration. The server writer
rechecks ownership; it is not exposed to the browser. Do not paste credentials
into chat or use real patient records.

## Migrations and seed data

Apply migrations only to a dedicated disposable/local Supabase test database
after reviewing them. Migration `202611180003_caregiver_read_access.sql` is
proposed and has not been applied to the linked hosted project.

```sh
export DATABASE_URL='postgresql://...'
PGDATABASE="$DATABASE_URL" psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202611180001_m2_persistence.sql
PGDATABASE="$DATABASE_URL" psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202611180002_m4_clinician_workflow.sql
PGDATABASE="$DATABASE_URL" psql -X -v ON_ERROR_STOP=1 -f supabase/migrations/202611180003_caregiver_read_access.sql
pnpm seed
```

`pnpm seed` requires `DATABASE_URL` and `psql`; it inserts synthetic profiles,
patients, check-ins, and placeholder food data. It does not create login
passwords. `pnpm seed:sql` prints the generated seed SQL without applying it.
Never point these commands at a production or real-patient database. SQL
policy tests require a suitable local/disposable Supabase database with the
Auth schema; see `supabase/tests/`.

## Checks

```sh
pnpm test
pnpm typecheck
pnpm eval
pnpm build
```

`pnpm eval` runs the deterministic evaluation scenarios and generates
[docs/EVAL_REPORT.md](docs/EVAL_REPORT.md) from the test runner's results.
The report evaluates prototype behavior only; it is not evidence of clinical
safety or effectiveness.

### Prototype handoff

On Node 26.13.1, the prototype passed 136 automated tests, 46 evaluation
scenarios, typecheck, and a production build. Seed SQL generation was checked
without writing to a database. Browser testing verified Layla's day-9 return,
barrier selection, check-in save, clinician alert evidence, and plan approval
visible to the patient. It also verified restoring an unsaved draft after
switching cycle days.

The browser walkthrough used the in-memory demo, not live Supabase. Live
sign-in with a provisioned account and persistent check-in writes still need
verification. The write test requires the service key configured privately on
the server. The hosted caregiver flow also requires review and application of
migration 003 before it can be verified.

## What is and is not implemented

Implemented: deterministic TypeScript engine; English/Arabic patient interface;
synthetic demo and role-aware Supabase sign-in; patient check-ins and device
drafts; clinician review and plan approval; consent-gated, read-only caregiver
view; measurement and safety pages; migrations, SQL seed, and automated
checks.

Not implemented: outbound WhatsApp messages, FHIR or health-exchange
integration, wearables, lab uploads, barcode scanning, additional languages,
offline synchronization, or an LLM wording layer. Food values, phase timing,
thresholds, and cohort metrics are illustrative placeholders pending review.
Arabic copy is machine-drafted and requires native-speaker and clinical review.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
[docs/SAFETY.md](docs/SAFETY.md), [docs/LIMITATIONS.md](docs/LIMITATIONS.md),
and [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) before interpreting the demo.
