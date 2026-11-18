import type { LocalizedText, PhaseId } from "@/engine/types";

export interface PhaseWindow {
  readonly id: PhaseId;
  readonly startDay: number;
  readonly endDay: number | null;
  readonly label: LocalizedText;
}

export const PHASE_WINDOWS: readonly PhaseWindow[] = [
  { id: "steroid", startDay: 1, endDay: 3, label: { en: "Steroid window", ar: "فترة الستيرويد" } },
  { id: "nausea", startDay: 4, endDay: 6, label: { en: "Peak nausea window", ar: "ذروة الغثيان" } },
  { id: "nadir", startDay: 7, endDay: 12, label: { en: "Low-immunity window", ar: "فترة المناعة المنخفضة" } },
  { id: "recovery", startDay: 13, endDay: null, label: { en: "Recovery window", ar: "فترة التعافي" } },
];

export interface FoodRule {
  readonly id: "FS-01" | "TX-01" | "TX-02" | "TX-03" | "TX-04" | "TX-05" | "TX-06";
  readonly label: string;
  readonly description: string;
  readonly status: "placeholder";
}

export const FOOD_RULES: readonly FoodRule[] = [
  { id: "FS-01", label: "Food safety", description: "With low immunity, filter undercooked egg, unpasteurised dairy, raw sprouts, and deli meat using standard safe-food-handling rules; this is not a strict neutropenic diet.", status: "placeholder" },
  { id: "TX-01", label: "Mouth sores", description: "Filter acidic, spicy, crunchy, and solid-texture foods.", status: "placeholder" },
  { id: "TX-02", label: "Severe nausea", description: "Filter warm, strong-smelling, greasy, or solid foods.", status: "placeholder" },
  { id: "TX-03", label: "Nausea", description: "Filter greasy foods.", status: "placeholder" },
  { id: "TX-04", label: "Metallic taste", description: "Filter red meat.", status: "placeholder" },
  { id: "TX-05", label: "Steroid hunger", description: "Prefer high-volume and higher-protein foods.", status: "placeholder" },
  { id: "TX-06", label: "Low appetite", description: "Prefer calorie-dense, easy-to-eat foods.", status: "placeholder" },
];

export const ALERT_THRESHOLDS = {
  meanIntakeBelowPercent: 60,
  weightLossAtLeastPercent: 2,
  sameSymptomAtLeastCheckIns: 3,
  symptomWindowLoggedCheckIns: 7,
  intakeWindowLoggedCheckIns: 3,
  status: "placeholder",
} as const;

export const ENGAGEMENT_THRESHOLDS = {
  nudgeAfterMissedDays: 1,
  shrinkPlanAfterMissedDays: 2,
  routineFlagAfterMissedDays: 3,
  routineFlagRequiresLastIntakeBelowPercent: 60,
} as const;

export const RED_FLAG_MESSAGE: LocalizedText = {
  en: "This may need urgent assessment. Contact your hospital oncology team now or call emergency services. This app cannot advise on urgent symptoms.",
  ar: "قد تحتاج هذه الحالة إلى تقييم عاجل. تواصل مع فريق الأورام في المستشفى الآن أو اتصل بخدمات الطوارئ. لا يستطيع التطبيق تقديم نصيحة بشأن الأعراض العاجلة.",
};
