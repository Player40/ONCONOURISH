import { describe, expect, it } from "vitest";
import { DEMO_DAYS } from "@/data/days";
import { FOODS } from "@/data/foods";
import { GUARDRAIL_SCENARIOS } from "@/data/scenarios";
import { ALLOWED_ROLES } from "@/data/roles";
import {
  buildDailyPlan,
  checkGuardrailText,
  evaluateCheckIn,
  evaluateNutritionAlert,
  getLapseResponse,
  getPhaseForCycleDay,
  getProgressBank,
  getWorkedActionStats,
  recommendFoods,
} from "@/engine";
import type { CheckIn, ConsentSettings } from "@/engine/types";

const baseCheckIn = (overrides: Partial<CheckIn> = {}): CheckIn => ({
  day: 14,
  symptoms: [],
  appetite: 3,
  intakePercent: 75,
  ...overrides,
});

const noConsents: ConsentSettings = { whatsappReminders: false, caregiverContact: false };

function alertCheckIns({
  intake = 59,
  weightKg = 66.64,
  nauseaDays = [1, 2, 3],
  days = 3,
}: {
  intake?: number;
  weightKg?: number;
  nauseaDays?: number[];
  days?: number;
} = {}): CheckIn[] {
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return {
      day,
      symptoms: nauseaDays.includes(day) ? ["nausea"] : [],
      appetite: 3,
      intakePercent: intake,
      weightKg,
    };
  });
}

describe("cycle phase selection from configured windows", () => {
  it.each([
    [1, "steroid"],
    [3, "steroid"],
    [4, "nausea"],
    [6, "nausea"],
    [7, "nadir"],
    [12, "nadir"],
    [13, "recovery"],
    [30, "recovery"],
  ] as const)("maps day %i to phase %s", (day, phase) => {
    expect(getPhaseForCycleDay(day).id).toBe(phase);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid cycle day %s", (day) => {
    expect(() => getPhaseForCycleDay(day)).toThrow(RangeError);
  });
});

describe("food recommendation rules", () => {
  it("filters all food-safety risks during low immunity and identifies FS-01", () => {
    const result = recommendFoods(
      baseCheckIn({ symptoms: ["low_immunity"] }),
      getPhaseForCycleDay(5),
    );
    const risks = FOODS.filter((food) => food.foodSafetyRisk);
    expect(result.excluded.filter(({ ruleId }) => ruleId === "FS-01").map(({ foodId }) => foodId))
      .toEqual(risks.map(({ id }) => id));
    expect(result.excluded.every(({ foodId, ruleId, reason }) => foodId && ruleId && reason)).toBe(true);
  });

  it("applies FS-01 in the configured low-immunity phase without a reported symptom", () => {
    const result = recommendFoods(baseCheckIn(), getPhaseForCycleDay(7));
    expect(result.lowImmunity).toBe(true);
    expect(result.excluded.some(({ ruleId }) => ruleId === "FS-01")).toBe(true);
  });

  it("filters acidic, crunchy, and solid foods for mouth sores", () => {
    const result = recommendFoods(
      baseCheckIn({ symptoms: ["mouth_sores"] }),
      getPhaseForCycleDay(5),
    );
    expect(result.excluded.find(({ foodId }) => foodId === "hummus")?.ruleId).toBe("TX-01");
    expect(result.excluded.find(({ foodId }) => foodId === "plate")?.ruleId).toBe("TX-01");
    expect(result.appliedRules).toContain("TX-01");
  });

  it("filters warm, strong-smelling, greasy, and solid foods for severe nausea", () => {
    const result = recommendFoods(
      baseCheckIn({ symptoms: ["nausea_severe"] }),
      getPhaseForCycleDay(5),
    );
    for (const id of ["lentil", "khichdi", "plate"]) {
      expect(result.excluded.find(({ foodId }) => foodId === id)?.ruleId).toBe("TX-02");
    }
  });

  it("filters greasy foods for nausea and red meat for metallic taste", () => {
    const nausea = recommendFoods(baseCheckIn({ symptoms: ["nausea"] }), getPhaseForCycleDay(5));
    const metallic = recommendFoods(baseCheckIn({ symptoms: ["metallic"] }), getPhaseForCycleDay(5));
    expect(nausea.excluded.find(({ foodId }) => foodId === "khichdi")?.ruleId).toBe("TX-03");
    expect(metallic.excluded.find(({ foodId }) => foodId === "kebab")?.ruleId).toBe("TX-04");
  });

  it("limits picks to three foods and two liquids with rationale, technique, and limits", () => {
    const result = recommendFoods(
      baseCheckIn({ appetite: 1, symptoms: ["nausea"] }),
      getPhaseForCycleDay(5),
    );
    expect(result.recommendations.length).toBeLessThanOrEqual(3);
    expect(result.recommendations.filter(({ food }) => food.texture === "liquid").length).toBeLessThanOrEqual(2);
    expect(result.recommendations.every(({ reasons, technique, limit }) => reasons.length > 0 && technique && limit))
      .toBe(true);
  });

  it("keeps decisions deterministic without mutating shared food data", () => {
    const checkIn = baseCheckIn({ symptoms: ["steroid_hunger"] });
    const phase = getPhaseForCycleDay(2);
    const before = recommendFoods(checkIn, phase);
    const after = recommendFoods(checkIn, phase);
    expect(after).toEqual(before);
    expect(FOODS.every((food) => !("_score" in food))).toBe(true);
  });

  it("applies preference boosts without changing the engine rules by locale", () => {
    const checkIn = baseCheckIn({ appetite: 1, symptoms: ["steroid_hunger"] });
    const english = evaluateCheckIn(checkIn, "en");
    const arabic = evaluateCheckIn(checkIn, "ar");
    expect(english.urgent).toBe(false);
    expect(arabic.urgent).toBe(false);
    if (!english.urgent && !arabic.urgent) {
      expect(arabic.recommendations.recommendations.map(({ food }) => food.id)).toEqual(
        english.recommendations.recommendations.map(({ food }) => food.id),
      );
      expect(arabic.recommendations.excluded).toEqual(english.recommendations.excluded);
      expect(english.recommendations.appliedRules).toContain("TX-05");
      expect(english.recommendations.appliedRules).toContain("TX-06");
    }
  });
});

describe("urgent check-in handling", () => {
  it("returns an urgent message and no food recommendations when a red flag is present", () => {
    const result = evaluateCheckIn(baseCheckIn({ redFlags: ["red_fever"] }), "en");
    expect(result.urgent).toBe(true);
    expect(result.recommendations).toBeNull();
    expect(result.message).toMatch(/urgent assessment/i);
  });
});

describe("nutrition alert boundaries", () => {
  it("fires only when all three conditions are met", () => {
    const result = evaluateNutritionAlert(alertCheckIns(), 68);
    expect(result.status).toBe("alert");
    expect(result.metConditions).toBe(3);
  });

  it("does not count exactly 60% intake as below threshold", () => {
    const result = evaluateNutritionAlert(alertCheckIns({ intake: 60 }), 68);
    expect(result.conditions.find(({ id }) => id === "intake")?.met).toBe(false);
  });

  it("uses the 2% weight-loss boundary", () => {
    const atBoundary = evaluateNutritionAlert(alertCheckIns({ weightKg: 66.64 }), 68);
    const belowBoundary = evaluateNutritionAlert(alertCheckIns({ weightKg: 66.708 }), 68);
    expect(atBoundary.conditions.find(({ id }) => id === "weight")?.met).toBe(true);
    expect(belowBoundary.conditions.find(({ id }) => id === "weight")?.met).toBe(false);
  });

  it("requires three occurrences of the same symptom in the last seven logged check-ins", () => {
    const twoOccurrences = evaluateNutritionAlert(
      alertCheckIns({ nauseaDays: [1, 2] }),
      68,
    );
    const threeOccurrences = evaluateNutritionAlert(alertCheckIns(), 68);
    expect(twoOccurrences.conditions.find(({ id }) => id === "symptom")?.met).toBe(false);
    expect(threeOccurrences.conditions.find(({ id }) => id === "symptom")?.met).toBe(true);
  });

  it("does not infer an intake alert with fewer than three logged check-ins", () => {
    const result = evaluateNutritionAlert(alertCheckIns({ days: 2 }), 68);
    const intake = result.conditions.find(({ id }) => id === "intake");
    expect(intake?.met).toBe(false);
    expect(intake?.value).toBeNull();
    expect(intake?.detail).toMatch(/insufficient data/i);
  });

  it("reports missing weight as unmet and marks exactly two conditions as watch", () => {
    const missingWeight = alertCheckIns().map(({ weightKg: _weightKg, ...checkIn }) => checkIn);
    const missing = evaluateNutritionAlert(missingWeight, 68);
    expect(missing.conditions.find(({ id }) => id === "weight")?.met).toBe(false);
    const watch = evaluateNutritionAlert(alertCheckIns({ nauseaDays: [1, 2] }), 68);
    expect(watch.status).toBe("watch");
    expect(watch.metConditions).toBe(2);
  });

  it("excludes steroid hunger from persistent symptoms", () => {
    const checkIns = alertCheckIns().map((checkIn) => ({ ...checkIn, symptoms: ["steroid_hunger"] as const }));
    const result = evaluateNutritionAlert(checkIns, 68);
    expect(result.conditions.find(({ id }) => id === "symptom")?.met).toBe(false);
  });
});

describe("lapse recovery and consent", () => {
  it("sends a gentle nudge after one missed day without shrinking the goal", () => {
    const result = getLapseResponse(1, 45, noConsents);
    expect(result.sendGentleNudge).toBe(true);
    expect(result.shrinkGoal).toBe(false);
    expect(result.askBarrier).toBe(false);
  });

  it("welcomes a returning user after two missed days without catch-up", () => {
    const result = getLapseResponse(2, 45, noConsents);
    expect(result.shrinkGoal).toBe(true);
    expect(result.welcomeBackWithoutCatchUp).toBe(true);
    expect(result.askBarrier).toBe(true);
  });

  it("raises the three-day routine flag only below 60% prior intake", () => {
    expect(getLapseResponse(3, 59, noConsents).raiseRoutineFlag).toBe(true);
    expect(getLapseResponse(3, 60, noConsents).raiseRoutineFlag).toBe(false);
    expect(getLapseResponse(3, undefined, noConsents).raiseRoutineFlag).toBe(false);
  });

  it("offers WhatsApp only with opt-in and blocks caregiver contact without consent", () => {
    const optedOut = getLapseResponse(2, 40, noConsents);
    const optedIn = getLapseResponse(2, 40, { whatsappReminders: true, caregiverContact: true });
    expect(optedOut.offerWhatsAppReminder).toBe(false);
    expect(optedOut.mayContactCaregiver).toBe(false);
    expect(optedIn.offerWhatsAppReminder).toBe(true);
    expect(optedIn.mayContactCaregiver).toBe(true);
  });

  it("shrinks to one action after a two-day lapse or a selected barrier", () => {
    expect(buildDailyPlan({ missedDays: 2 }).actions).toHaveLength(1);
    expect(buildDailyPlan({ missedDays: 0, selectedBarrier: "cost" }).actions).toHaveLength(1);
    expect(buildDailyPlan({ missedDays: 0 }).actions).toHaveLength(3);
  });

  it("keeps the progress bank through gaps and counts offered/completed actions", () => {
    expect(getProgressBank(DEMO_DAYS, 5)).toBe(5);
    expect(getProgressBank(DEMO_DAYS, 8)).toBe(5);
    expect(getProgressBank(DEMO_DAYS, 9)).toBe(6);
    const liquid = getWorkedActionStats(DEMO_DAYS).find(({ action }) => action === "liquid");
    expect(liquid?.offered).toBeGreaterThan(0);
    expect(liquid?.completed).toBeGreaterThan(0);
    expect(liquid?.completionRate).toBe(liquid!.completed / liquid!.offered);
  });

  it("includes the cutoff day in worked-action stats", () => {
    const cold = getWorkedActionStats(DEMO_DAYS, 5).find(({ action }) => action === "cold");
    expect(cold?.offered).toBe(3);
    expect(cold?.completed).toBe(3);
  });
});

describe("guardrails and locale parity", () => {
  it.each(GUARDRAIL_SCENARIOS)("$id routes to $expectedGuardrail", ({ input, expectedGuardrail }) => {
    expect(checkGuardrailText(input).id).toBe(expectedGuardrail);
  });

  it("prioritizes urgent symptoms over fasting topics", () => {
    expect(checkGuardrailText("I have a fever during Ramadan").id).toBe("G-URG");
  });

  it("localizes guardrail responses without changing the triggered rule", () => {
    const english = checkGuardrailText("Can keto cure my cancer?", "en");
    const arabic = checkGuardrailText("Can keto cure my cancer?", "ar");
    expect(arabic.id).toBe(english.id);
    expect(arabic.message).not.toBe(english.message);
  });

  it("allows only patient, caregiver, and clinician roles", () => {
    expect(ALLOWED_ROLES).toEqual(["patient", "caregiver", "clinician"]);
  });
});
