import { ALERT_THRESHOLDS } from "@/data/rules";
import type { CheckIn, SymptomId } from "@/engine/types";

export interface AlertCondition {
  readonly id: "intake" | "weight" | "symptom";
  readonly label: string;
  readonly met: boolean;
  readonly value: number | null;
  readonly threshold: number;
  readonly sourceDays: readonly number[];
  readonly detail: string;
}

export interface NutritionAlertResult {
  readonly status: "alert" | "watch" | "clear";
  readonly metConditions: number;
  readonly conditions: readonly AlertCondition[];
}

const isValidIntake = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;

export function evaluateNutritionAlert(
  checkIns: readonly CheckIn[],
  baselineWeightKg: number,
): NutritionAlertResult {
  if (!Number.isFinite(baselineWeightKg) || baselineWeightKg <= 0) {
    throw new RangeError("Baseline weight must be a positive finite number.");
  }

  const logged = [...checkIns].sort((a, b) => a.day - b.day);
  for (const checkIn of logged) {
    if (!Number.isInteger(checkIn.day) || checkIn.day < 1 || !isValidIntake(checkIn.intakePercent)) {
      throw new RangeError("Check-ins must have a positive day and intake between 0 and 100 percent.");
    }
  }

  const recentIntake = logged.slice(-ALERT_THRESHOLDS.intakeWindowLoggedCheckIns);
  const intakeMean =
    recentIntake.length === ALERT_THRESHOLDS.intakeWindowLoggedCheckIns
      ? recentIntake.reduce((sum, checkIn) => sum + checkIn.intakePercent, 0) / recentIntake.length
      : null;
  const intakeCondition: AlertCondition = {
    id: "intake",
    label: "Mean intake over the last 3 logged days is below 60% of target",
    met: intakeMean !== null && intakeMean < ALERT_THRESHOLDS.meanIntakeBelowPercent,
    value: intakeMean,
    threshold: ALERT_THRESHOLDS.meanIntakeBelowPercent,
    sourceDays: recentIntake.map(({ day }) => day),
    detail:
      intakeMean === null
        ? "Insufficient data: three logged check-ins are required."
        : `${intakeMean.toFixed(1)}% mean intake`,
  };

  const latestWithWeight = [...logged].reverse().find(({ weightKg }) => weightKg !== undefined);
  const weightLossPercent =
    latestWithWeight?.weightKg === undefined
      ? null
      : ((baselineWeightKg - latestWithWeight.weightKg) / baselineWeightKg) * 100;
  const weightThresholdKg =
    baselineWeightKg * (1 - ALERT_THRESHOLDS.weightLossAtLeastPercent / 100);
  const weightCondition: AlertCondition = {
    id: "weight",
    label: "Weight is down 2% or more from baseline",
    met:
      weightLossPercent !== null &&
      latestWithWeight?.weightKg !== undefined &&
      latestWithWeight.weightKg <= weightThresholdKg,
    value: weightLossPercent,
    threshold: ALERT_THRESHOLDS.weightLossAtLeastPercent,
    sourceDays: latestWithWeight ? [latestWithWeight.day] : [],
    detail:
      weightLossPercent === null
        ? "No logged weight is available."
        : `${weightLossPercent.toFixed(1)}% loss from ${baselineWeightKg.toFixed(1)} kg`,
  };

  const symptomWindow = logged.slice(-ALERT_THRESHOLDS.symptomWindowLoggedCheckIns);
  const counts = new Map<SymptomId, number>();
  for (const checkIn of symptomWindow) {
    for (const symptom of new Set(checkIn.symptoms)) {
      if (symptom !== "steroid_hunger") counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
    }
  }
  const topSymptom = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const symptomCondition: AlertCondition = {
    id: "symptom",
    label: "The same symptom appears on 3 or more of the last 7 logged check-ins",
    met: topSymptom !== undefined && topSymptom[1] >= ALERT_THRESHOLDS.sameSymptomAtLeastCheckIns,
    value: topSymptom?.[1] ?? null,
    threshold: ALERT_THRESHOLDS.sameSymptomAtLeastCheckIns,
    sourceDays: topSymptom
      ? symptomWindow.filter(({ symptoms }) => symptoms.includes(topSymptom[0])).map(({ day }) => day)
      : [],
    detail: topSymptom ? `${topSymptom[0]} on ${topSymptom[1]} check-ins` : "No repeated symptoms.",
  };

  const conditions = [intakeCondition, weightCondition, symptomCondition] as const;
  const metConditions = conditions.filter(({ met }) => met).length;
  return {
    status: metConditions === 3 ? "alert" : metConditions === 2 ? "watch" : "clear",
    metConditions,
    conditions,
  };
}
