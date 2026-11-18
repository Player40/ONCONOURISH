# Limitations

OncoNourish is a synthetic prototype. It is not clinically validated, is not
for diagnosis or treatment, and must not be used with real patient data.

- **Clinical content:** food items, nutrient values, serving sizes, symptom
  filters, cycle timing, alert thresholds, behavioral-technique labels, and
  action plans are illustrative placeholders pending dietitian and
  behavioral-science review. The M1 library contains the 23 foods in the
  source prototype; no 24th food was invented.
- **Cycle model:** one fixed 14-day synthetic course is used. Days 1–3,
  4–6, 7–12, and 13 onward are illustrative phase windows, not a configurable
  regimen or treatment calendar. The patient workspace defaults to cycle day
  9; it does not calculate the current day from a real treatment date.
- **Measurements:** intake percentage is self-reported against a person's
  usual eating, not a measured nutrition value. Weight is optional. Alert
  rules use small fixed windows and placeholder cutoffs.
- **Synthetic cohort:** measurement charts come from a seeded generator, not
  observed people or clinical outcomes. Similar language-group metrics are
  constructed and cannot demonstrate equity or inequity.
- **Food library and safety:** the small library and deterministic filters
  cannot assess allergies, drug-food interactions, individualized care plans,
  or all food-safety risks. They do not replace a dietitian.
- **Guardrails:** fixed patterns cover a selected set of English and Arabic
  phrases. They can miss paraphrases, mixed-language questions, context, and
  misspellings. They are not a general medical safety classifier.
- **Language and accessibility:** Arabic is machine-drafted and requires
  native-speaker and clinical review. This prototype does not provide the
  additional languages listed in the product brief. Accessibility has not
  been independently audited.
- **Persistence and operations:** the demo repository is process-local and
  resets on restart. Supabase authentication, RLS, and the patient write path
  require correct project configuration and migrations. The proposed
  caregiver migration `202611180003_caregiver_read_access.sql` has not been
  applied to the linked hosted project. No production deployment has been
  verified.
- **Offline drafts:** a draft is kept in browser localStorage for the
  synthetic patient and cycle day. It does not sync, submit automatically, or
  provide an offline copy of the app. It may remain on the device until saved
  or canceled.
- **Communications and integrations:** WhatsApp messages, FHIR/health-exchange
  integration, wearables, lab uploads, barcode scanning, and additional
  languages are not implemented. No language model is integrated.

The app does not claim to prevent treatment interruptions, improve survival,
or treat cancer.
