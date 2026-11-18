import { RED_FLAG_IDS, SYMPTOM_IDS, type CheckIn, type RedFlagId, type SymptomId } from "@/engine/types";
import { isRecord } from "@/lib/workflow-input";

function isOneOf<T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.some((candidate) => candidate === value);
}

function isAppetite(value: unknown): value is CheckIn["appetite"] {
  return typeof value === "number" && [1, 2, 3, 4, 5].some((candidate) => candidate === value);
}

export function parseOfflineCheckInDraft(value: unknown): CheckIn | null {
  if (!isRecord(value) ||
      typeof value.day !== "number" || !Number.isInteger(value.day) || value.day < 1 || value.day > 14 ||
      !Array.isArray(value.symptoms) || !value.symptoms.every((item) => isOneOf(SYMPTOM_IDS, item)) ||
      !isAppetite(value.appetite) ||
      typeof value.intakePercent !== "number" || !Number.isFinite(value.intakePercent) ||
      value.intakePercent < 0 || value.intakePercent > 100) {
    return null;
  }

  if (value.weightKg !== undefined &&
      (typeof value.weightKg !== "number" || !Number.isFinite(value.weightKg) || value.weightKg <= 0 || value.weightKg > 500)) {
    return null;
  }
  if (value.redFlags !== undefined &&
      (!Array.isArray(value.redFlags) || !value.redFlags.every((item) => isOneOf(RED_FLAG_IDS, item)))) {
    return null;
  }

  const symptoms: SymptomId[] = value.symptoms;
  const redFlags: RedFlagId[] | undefined = value.redFlags;
  return {
    day: value.day,
    symptoms,
    appetite: value.appetite,
    intakePercent: value.intakePercent,
    ...(value.weightKg === undefined ? {} : { weightKg: value.weightKg }),
    ...(redFlags === undefined ? {} : { redFlags }),
  };
}
