import { RED_FLAG_IDS, SYMPTOM_IDS, type CheckIn } from "@/engine/types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function findId<T extends string>(value: unknown, values: readonly T[], label: string): T {
  const found = values.find((candidate) => candidate === value);
  if (found === undefined) throw new TypeError(`${label} is not supported.`);
  return found;
}

export function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

export function parseIdList<T extends string>(value: unknown, label: string, allowed: readonly T[]): T[] {
  if (!Array.isArray(value) || value.length > allowed.length) throw new TypeError(`${label} must be a list of supported IDs.`);
  return [...new Set(value.map((entry) => findId(entry, allowed, label)))];
}

export function parseCheckIn(value: unknown, maxDay: number): CheckIn {
  if (!isRecord(value)) throw new TypeError("Check-in must be an object.");
  const day = integer(value.day, "Day", 1, maxDay);
  const appetite = value.appetite;
  if (appetite !== 1 && appetite !== 2 && appetite !== 3 && appetite !== 4 && appetite !== 5) {
    throw new RangeError("Appetite must be an integer from 1 to 5.");
  }
  if (typeof value.intakePercent !== "number" || !Number.isFinite(value.intakePercent) ||
      value.intakePercent < 0 || value.intakePercent > 100) {
    throw new RangeError("Intake must be between 0 and 100 percent.");
  }
  const weightKg = value.weightKg;
  if (weightKg !== undefined && weightKg !== null &&
      (typeof weightKg !== "number" || !Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500)) {
    throw new RangeError("Weight must be greater than 0 and at most 500 kg.");
  }
  return {
    day, appetite, intakePercent: value.intakePercent,
    symptoms: parseIdList(value.symptoms, "Symptoms", SYMPTOM_IDS),
    redFlags: parseIdList(value.redFlags ?? [], "Urgent flags", RED_FLAG_IDS),
    ...(typeof weightKg === "number" ? { weightKg } : {}),
  };
}
