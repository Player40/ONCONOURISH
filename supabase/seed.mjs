import { DEMO_DAYS } from "../src/data/days.ts";
import { FOODS } from "../src/data/foods.ts";

const sql = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const array = (values) => `ARRAY[${values.map(sql).join(", ")}]::text[]`;
const user = (number) => `10000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const patient = (number) => `20000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const statements = [
  "-- Synthetic demo data only; placeholder clinical values require review.",
  "begin;",
];

for (const [number, role, name] of [
  [1, "patient", "Layla M. (synthetic)"],
  [2, "patient", "Omar K. (synthetic)"],
  [3, "patient", "Priya S. (synthetic)"],
  [4, "clinician", "Clinician (synthetic)"],
  [5, "caregiver", "Caregiver (synthetic)"],
]) {
  statements.push(
    `insert into auth.users (id, aud, role, email, created_at, updated_at) values (${sql(user(number))}, 'authenticated', 'authenticated', ${sql(`synthetic-${number}@example.invalid`)}, now(), now()) on conflict (id) do nothing;`,
    `insert into public.profiles (id, role, display_name, locale) values (${sql(user(number))}, ${sql(role)}, ${sql(name)}, 'en') on conflict (id) do nothing;`,
  );
}

for (const [number, name, diagnosis, regimen, weight, likes, budget] of [
  [1, "Layla M. (synthetic)", "Breast cancer", "AC-T chemotherapy, cycle 2", 68, ["laban", "dates", "khichdi", "ricepud"], 2],
  [2, "Omar K. (synthetic)", "Colorectal cancer", "PLACEHOLDER: pending dietitian review", 75, [], 2],
  [3, "Priya S. (synthetic)", "Lung cancer", "PLACEHOLDER: pending dietitian review", 60, [], 2],
]) {
  const targets = number === 1 ? { caloriesKcal: 1900, proteinGrams: 70 } : {};
  statements.push(
    `insert into public.patients (id, user_id, clinician_id, pseudonym, dx, regimen, cycle_start, baseline_weight_kg, targets, likes, budget, locale) values (${sql(patient(number))}, ${sql(user(number))}, ${sql(user(4))}, ${sql(name)}, ${sql(diagnosis)}, ${sql(regimen)}, '2026-01-01', ${weight}, ${sql(JSON.stringify(targets))}::jsonb, ${array(likes)}, ${budget}, 'en') on conflict (id) do nothing;`,
  );
  for (const purpose of ["share_with_care_team", "caregiver_access", "whatsapp_reminders"]) {
    statements.push(
      `insert into public.consents (patient_id, purpose, granted) values (${sql(patient(number))}, ${sql(purpose)}, ${purpose === "share_with_care_team"}) on conflict (patient_id, purpose) do nothing;`,
    );
  }
}

statements.push(
  `insert into public.caregiver_links (patient_id, caregiver_user_id, active) values (${sql(patient(1))}, ${sql(user(5))}, true) on conflict (patient_id, caregiver_user_id) do nothing;`,
);

for (const day of DEMO_DAYS) {
  if (!day.logged) continue;
  statements.push(
    `insert into public.checkins (patient_id, day, symptoms, red_flags, appetite, intake_pct, weight_kg) values (${sql(patient(1))}, ${day.day}, ${array(day.symptoms)}, '{}'::text[], ${day.appetite}, ${day.intakePercent}, ${day.weightKg ?? "NULL"}) on conflict (patient_id, day) do nothing;`,
  );
  for (const action of day.actionsOffered) {
    statements.push(
      `insert into public.actions_offered (patient_id, day, action_type, done) values (${sql(patient(1))}, ${day.day}, ${sql(action)}, ${day.actionsCompleted.includes(action)}) on conflict (patient_id, day, action_type) do nothing;`,
    );
  }
}

for (const [number, day, appetite, intake, weight] of [
  [2, 1, 4, 80, 75], [2, 2, 4, 85, 75],
  [3, 1, 3, 55, 60], [3, 2, 2, 50, 59.5], [3, 3, 2, 50, 58.8],
]) {
  statements.push(
    `insert into public.checkins (patient_id, day, appetite, intake_pct, weight_kg) values (${sql(patient(number))}, ${day}, ${appetite}, ${intake}, ${weight}) on conflict (patient_id, day) do nothing;`,
  );
}

for (const food of FOODS) {
  statements.push(
    `insert into public.food_items (id, name_en, name_ar, serving, kcal, protein_g, temp, texture, tags, cost, fs_risk, source, placeholder) values (${sql(food.id)}, ${sql(food.name.en)}, ${sql(food.name.ar)}, ${sql(food.serving)}, ${food.caloriesKcal}, ${food.proteinGrams}, ${sql(food.temperature)}, ${sql(food.texture)}, ${array(food.tags)}, ${food.cost}, ${sql(food.foodSafetyRisk)}, 'Synthetic prototype; PLACEHOLDER: pending dietitian review', true) on conflict (id) do nothing;`,
  );
}

statements.push("commit;");
process.stdout.write(`${statements.join("\n")}\n`);
