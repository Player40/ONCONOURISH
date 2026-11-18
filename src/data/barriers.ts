import type { BarrierId, LocalizedText } from "@/engine/types";

export interface BarrierResponse {
  readonly label: LocalizedText;
  readonly title: string;
  readonly response: string;
  readonly technique: string;
}

export const BARRIERS: Record<BarrierId, BarrierResponse> = {
  nausea: {
    label: { en: "Nausea", ar: "الغثيان" },
    title: "Cold, small and sippable",
    response: "Try 100 ml of cold laban or banana milk every 2 hours instead of full meals today.",
    technique: "Problem solving; Graded tasks",
  },
  taste: {
    label: { en: "Taste changes", ar: "تغيّر الطعم" },
    title: "Work around the taste",
    response: "Cold or room-temperature foods, plastic cutlery and mild flavours often help. If something tastes wrong, another food counts the same.",
    technique: "Problem solving",
  },
  tired: {
    label: { en: "Too tired", ar: "التعب" },
    title: "Zero-prep only",
    response: "Today we only use ready options: yoghurt, dates with tahini, a ready drink. Ask someone to put them within reach.",
    technique: "Restructuring the physical environment; Social support (practical)",
  },
  cost: {
    label: { en: "Cost or availability", ar: "التكلفة أو التوفر" },
    title: "Use what you already have",
    response: "We lean on staples: lentils, rice, eggs, laban. No special products needed.",
    technique: "Problem solving",
  },
  forgot: {
    label: { en: "I forgot", ar: "نسيت" },
    title: "Attach it to a habit",
    response: "Take your drink with your morning medicines. Reminder moved to 08:30 so it rides on something you already do.",
    technique: "Action planning; Prompts and cues",
  },
  guilt: {
    label: { en: "Guilt about food", ar: "الشعور بالذنب تجاه الطعام" },
    title: "Fortify, do not forbid",
    response: "Any food you can eat counts toward your goal. Comfort foods stay, with small boosts like a spoon of nut butter.",
    technique: "Reduce negative emotions; Cognitive restructuring",
  },
};
