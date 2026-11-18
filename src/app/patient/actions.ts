"use server";

import {
  ACTION_IDS,
  BARRIER_IDS,
  RED_FLAG_IDS,
  SYMPTOM_IDS,
} from "@/engine/types";
import type { ActionId, CheckIn, RedFlagId, SymptomId } from "@/engine/types";
import { buildDailyPlan, evaluateCheckIn } from "@/engine";
import { DEMO_PATIENT_IDS } from "@/lib/demo-repository";
import type { ConsentPurpose, Repository } from "@/lib/repository";
import { buildPatientSnapshot, getPatientRepository, type PatientSnapshot } from "./service";

const consentPurposes = ["share_with_care_team", "caregiver_access", "whatsapp_reminders"] as const;
const allowedIntakes = new Set([25, 50, 75, 100]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findId<T extends string>(value: unknown, values: readonly T[], label: string): T {
  const found = values.find((candidate) => candidate === value);
  if (found === undefined) throw new TypeError(`${label} is not supported.`);
  return found;
}

function integer(value: unknown, label: string, minimum: number, maximum: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

function parseIdList<T extends string>(
  value: unknown,
  label: string,
  allowed: readonly T[],
): T[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be a list.`);
  return [...new Set(value.map((entry) => findId(entry, allowed, label)))];
}

function parseCheckIn(value: unknown): CheckIn {
  if (!isRecord(value)) throw new TypeError("Check-in must be an object.");
  const day = integer(value.day, "Day", 1, 14);
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
    throw new RangeError("Weight must be between 1 and 500 kg.");
  }

  return {
    day,
    appetite,
    intakePercent: value.intakePercent,
    symptoms: parseIdList<SymptomId>(value.symptoms, "Symptoms", SYMPTOM_IDS),
    redFlags: parseIdList<RedFlagId>(value.redFlags ?? [], "Urgent flags", RED_FLAG_IDS),
    ...(typeof weightKg === "number" ? { weightKg } : {}),
  };
}

function parseDay(value: unknown): number {
  return integer(value, "Day", 1, 14);
}

function getDailyActions(snapshot: PatientSnapshot, day: number): readonly ActionId[] {
  const dayView = snapshot.days[day - 1];
  if (!dayView?.checkIn) throw new Error("Complete today's check-in before tracking actions.");
  if (evaluateCheckIn(dayView.checkIn).urgent) return [];
  const barrier = snapshot.barriers.find((record) => record.day === day);
  return buildDailyPlan({
    missedDays: dayView.missedDays,
    ...(barrier ? { selectedBarrier: barrier.barrier } : {}),
  }).actions.map(({ id }) => id);
}

async function reload(repository: Repository, day: number): Promise<PatientSnapshot> {
  return buildPatientSnapshot(repository, day);
}

export async function saveCheckInAction(input: unknown): Promise<PatientSnapshot> {
  const checkIn = parseCheckIn(input);
  const repository = getPatientRepository();
  const existing = (await repository.listCheckIns(DEMO_PATIENT_IDS.layla))
    .find(({ day }) => day === checkIn.day);
  if (!allowedIntakes.has(checkIn.intakePercent) &&
      existing?.intakePercent !== checkIn.intakePercent) {
    throw new RangeError("New check-ins must use 25, 50, 75, or 100 percent intake.");
  }
  await repository.saveCheckIn(DEMO_PATIENT_IDS.layla, checkIn);
  return reload(repository, checkIn.day);
}

export async function saveBarrierAction(dayValue: unknown, barrierValue: unknown): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const barrier = findId(barrierValue, BARRIER_IDS, "Barrier");
  const repository = getPatientRepository();
  const snapshot = await reload(repository, day);
  const currentDay = snapshot.days[day - 1];
  if (!currentDay?.checkIn || currentDay.missedDays < 2) {
    throw new Error("Barrier selection is available only when returning after a gap.");
  }
  const existingBarrier = snapshot.barriers.find((record) => record.day === day);
  if (existingBarrier) throw new Error("A barrier has already been saved for this check-in.");
  await repository.saveBarrier(DEMO_PATIENT_IDS.layla, {
    day,
    barrier,
    responseId: barrier,
  });
  return reload(repository, day);
}

export async function saveActionAction(
  dayValue: unknown,
  actionValue: unknown,
  done: unknown,
): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const actionType = findId(actionValue, ACTION_IDS, "Action");
  if (typeof done !== "boolean") throw new TypeError("Action completion must be boolean.");
  const repository = getPatientRepository();
  const snapshot = await reload(repository, day);
  if (!getDailyActions(snapshot, day).includes(actionType)) {
    throw new Error("This action is not part of today's plan.");
  }
  await repository.saveAction(DEMO_PATIENT_IDS.layla, { day, actionType, done });
  return reload(repository, day);
}

export async function setConsentAction(
  purposeValue: unknown,
  granted: unknown,
  dayValue: unknown,
): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const purpose = findId(purposeValue, consentPurposes, "Consent purpose");
  if (typeof granted !== "boolean") throw new TypeError("Consent value must be boolean.");
  const consentPurpose: ConsentPurpose = purpose;
  const repository = getPatientRepository();
  await repository.setConsent(DEMO_PATIENT_IDS.layla, consentPurpose, granted);
  return reload(repository, day);
}

export async function requestRamadanAction(dayValue: unknown): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const repository = getPatientRepository();
  const requests = await repository.listRamadanRequests(DEMO_PATIENT_IDS.layla);
  if (requests.some(({ status }) => status === "pending" || status === "cleared")) {
    throw new Error("A pending or cleared Ramadan request already exists.");
  }
  await repository.createRamadanRequest(DEMO_PATIENT_IDS.layla);
  return reload(repository, day);
}
