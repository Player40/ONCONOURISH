import { FOODS } from "@/data/foods";
import { DEMO_PROFILE } from "@/data/profile";
import type { CyclePhase } from "@/engine/phases";
import type { CheckIn, FoodItem, FoodTag, SymptomId } from "@/engine/types";

export type FoodRuleId = "FS-01" | "TX-01" | "TX-02" | "TX-03" | "TX-04";

export interface FoodExclusion {
  readonly foodId: string;
  readonly ruleId: FoodRuleId;
  readonly reason: string;
}

export interface FoodRecommendation {
  readonly food: FoodItem;
  readonly reasons: readonly string[];
  readonly technique: string;
  readonly limit: string;
}

export interface RecommendationResult {
  readonly recommendations: readonly FoodRecommendation[];
  readonly excluded: readonly FoodExclusion[];
  readonly appliedRules: readonly string[];
  readonly lowImmunity: boolean;
  readonly tip: string;
}

const hasTag = (food: FoodItem, tag: FoodTag) => food.tags.includes(tag);
const hasSymptom = (symptoms: readonly SymptomId[], symptom: SymptomId) => symptoms.includes(symptom);

function reasonFor(food: FoodItem, checkIn: CheckIn): string[] {
  const reasons: string[] = [];
  if (
    food.temperature === "cold" &&
    (hasSymptom(checkIn.symptoms, "nausea") ||
      hasSymptom(checkIn.symptoms, "nausea_severe") ||
      hasSymptom(checkIn.symptoms, "metallic"))
  ) {
    reasons.push("Cold: may be easier with nausea or a metallic taste (TX-02, TX-04).");
  }
  if (food.texture === "liquid" && checkIn.appetite <= 2) {
    reasons.push("Liquid calories when appetite is low (TX-06).");
  }
  if (food.caloriesKcal >= 200) {
    reasons.push(`${food.caloriesKcal} kcal and ${food.proteinGrams} g protein per serving (placeholder values).`);
  }
  if (DEMO_PROFILE.likes.some((id) => id === food.id)) {
    reasons.push("Matches foods on the demo profile.");
  }
  reasons.push("Passed food-safety and symptom filters.");
  return reasons;
}

export function recommendFoods(checkIn: CheckIn, phase: CyclePhase): RecommendationResult {
  const lowImmunity = hasSymptom(checkIn.symptoms, "low_immunity") || phase.id === "nadir";
  const excluded: FoodExclusion[] = [];
  const candidates: FoodItem[] = [];
  const appliedRules = new Set<string>();

  for (const food of FOODS) {
    let ruleId: FoodRuleId | undefined;
    let reason: string | undefined;

    if (food.foodSafetyRisk && lowImmunity) {
      ruleId = "FS-01";
      reason = `${food.foodSafetyRisk} (standard safe-food-handling rule)`;
    } else if (
      hasSymptom(checkIn.symptoms, "mouth_sores") &&
      (hasTag(food, "acidic") ||
        hasTag(food, "spicy") ||
        hasTag(food, "crunchy") ||
        food.texture === "solid")
    ) {
      ruleId = "TX-01";
      reason = "May irritate mouth sores";
    } else if (
      hasSymptom(checkIn.symptoms, "nausea_severe") &&
      (hasTag(food, "strong_smell") ||
        hasTag(food, "greasy") ||
        food.temperature === "warm" ||
        food.texture === "solid")
    ) {
      ruleId = "TX-02";
      reason = "Severe nausea: cold or room-temperature, low-smell foods only";
    } else if (hasSymptom(checkIn.symptoms, "nausea") && hasTag(food, "greasy")) {
      ruleId = "TX-03";
      reason = "Greasy foods can worsen nausea";
    } else if (hasSymptom(checkIn.symptoms, "metallic") && hasTag(food, "red_meat")) {
      ruleId = "TX-04";
      reason = "Red meat may taste metallic";
    }

    if (ruleId && reason) {
      excluded.push({ foodId: food.id, ruleId, reason });
      appliedRules.add(ruleId);
    } else {
      candidates.push(food);
    }
  }

  const steroidHunger =
    hasSymptom(checkIn.symptoms, "steroid_hunger") || (phase.id === "steroid" && checkIn.appetite >= 4);
  if (steroidHunger) appliedRules.add("TX-05");
  if (checkIn.appetite <= 2) appliedRules.add("TX-06");

  const ranked = candidates
    .map((food, sourceIndex) => {
      let score = 0;
      const calorieDense = food.caloriesKcal >= 200 && food.texture !== "solid";
      if (checkIn.appetite <= 2) {
        score += (calorieDense ? 3 : 0) + food.caloriesKcal / 150;
      }
      if (steroidHunger) {
        score += (hasTag(food, "high_volume") ? 3 : 0) + food.proteinGrams / 6;
      }
      if (
        hasSymptom(checkIn.symptoms, "nausea") ||
        hasSymptom(checkIn.symptoms, "nausea_severe") ||
        hasSymptom(checkIn.symptoms, "metallic")
      ) {
        score += food.temperature === "cold" ? 2 : food.temperature === "room" ? 1 : 0;
      }
      if (DEMO_PROFILE.likes.some((id) => id === food.id)) score += 1.5;
      if (food.cost <= 2) score += 0.4;
      if (food.foodSafetyRisk) score -= 10;
      return { food, score, sourceIndex };
    })
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex);

  const recommendations: FoodRecommendation[] = [];
  let liquidCount = 0;
  for (const { food } of ranked) {
    if (recommendations.length === 3) break;
    if (food.texture === "liquid" && liquidCount === 2) continue;
    if (food.texture === "liquid") liquidCount += 1;
    recommendations.push({
      food,
      reasons: reasonFor(food, checkIn),
      technique: "Prompts and cues",
      limit: "Nutrient values are placeholders until reviewed; this does not replace a dietitian’s targets.",
    });
  }

  return {
    recommendations,
    excluded,
    appliedRules: [...appliedRules].sort(),
    lowImmunity,
    tip:
      checkIn.appetite <= 2
        ? "Fortify, do not forbid: stir 1 tablespoon of nut butter into a shake or oats (about +95 kcal, +4 g protein; placeholder values)."
        : "Small, frequent portions may be easier than big meals when energy is low.",
  };
}
