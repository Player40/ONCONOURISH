export type Locale = "en" | "ar";

export interface LocalizedText {
  readonly en: string;
  readonly ar: string;
}

export const SYMPTOM_IDS = [
  "nausea",
  "nausea_severe",
  "metallic",
  "mouth_sores",
  "steroid_hunger",
  "low_immunity",
  "fatigue",
] as const;

export type SymptomId = (typeof SYMPTOM_IDS)[number];

export const RED_FLAG_IDS = ["red_fluids", "red_fever"] as const;
export type RedFlagId = (typeof RED_FLAG_IDS)[number];

export const BARRIER_IDS = ["nausea", "taste", "tired", "cost", "forgot", "guilt"] as const;
export type BarrierId = (typeof BARRIER_IDS)[number];

export const ACTION_IDS = ["liquid", "small", "fluids", "cold", "hot"] as const;
export type ActionId = (typeof ACTION_IDS)[number];

export type PhaseId = "steroid" | "nausea" | "nadir" | "recovery";
export type FoodTemperature = "cold" | "warm" | "room";
export type FoodTexture = "liquid" | "soft" | "solid";
export type FoodTag =
  | "bland"
  | "sweet"
  | "strong_smell"
  | "greasy"
  | "acidic"
  | "spicy"
  | "crunchy"
  | "high_volume"
  | "red_meat";

export interface FoodItem {
  readonly id: string;
  readonly name: LocalizedText;
  readonly serving: string;
  readonly caloriesKcal: number;
  readonly proteinGrams: number;
  readonly temperature: FoodTemperature;
  readonly texture: FoodTexture;
  readonly tags: readonly FoodTag[];
  readonly cost: 1 | 2 | 3;
  readonly foodSafetyRisk?: string;
  readonly placeholderNutrients: true;
}

export interface CheckIn {
  readonly day: number;
  readonly symptoms: readonly SymptomId[];
  readonly appetite: 1 | 2 | 3 | 4 | 5;
  readonly intakePercent: number;
  readonly weightKg?: number;
  readonly redFlags?: readonly RedFlagId[];
}

export interface LoggedDemoDay extends CheckIn {
  readonly logged: true;
  readonly actionsOffered: readonly ActionId[];
  readonly actionsCompleted: readonly ActionId[];
}

export interface MissedDemoDay {
  readonly day: number;
  readonly logged: false;
}

export type DemoDay = LoggedDemoDay | MissedDemoDay;

export interface ConsentSettings {
  readonly whatsappReminders: boolean;
  readonly caregiverContact: boolean;
}
