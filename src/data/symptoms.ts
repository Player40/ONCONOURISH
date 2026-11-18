import type { LocalizedText, RedFlagId, SymptomId } from "@/engine/types";

export const SYMPTOMS: Record<SymptomId, LocalizedText> = {
  nausea: { en: "Nausea", ar: "غثيان" },
  nausea_severe: { en: "Severe nausea", ar: "غثيان شديد" },
  metallic: { en: "Metallic taste", ar: "طعم معدني" },
  mouth_sores: { en: "Mouth sores", ar: "تقرحات الفم" },
  steroid_hunger: { en: "Steroid hunger", ar: "جوع بسبب الستيرويد" },
  low_immunity: { en: "Low immunity (told by my team)", ar: "مناعة منخفضة (أخبرني الفريق)" },
  fatigue: { en: "Fatigue", ar: "إرهاق" },
};

export const RED_FLAGS: Record<RedFlagId, LocalizedText> = {
  red_fluids: { en: "Can't keep fluids down for 24 h", ar: "لا أستطيع الاحتفاظ بالسوائل منذ ٢٤ ساعة" },
  red_fever: { en: "Fever or chills", ar: "حمى أو قشعريرة" },
};
