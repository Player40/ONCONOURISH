"use server";

import { ACTION_IDS, BARRIER_IDS, type ActionId } from "@/engine/types";
import { buildDailyPlan, evaluateCheckIn } from "@/engine";
import { processCheckIn } from "@/lib/check-in-workflow";
import { findId, integer, parseCheckIn } from "@/lib/workflow-input";
import type { ConsentPurpose } from "@/lib/repository";
import { buildPatientSnapshot, getPatientContext, type PatientContext, type PatientSnapshot } from "./service";

const consentPurposes = ["share_with_care_team", "caregiver_access", "whatsapp_reminders"] as const;

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

async function reload(context: PatientContext, day: number): Promise<PatientSnapshot> {
  return buildPatientSnapshot(
    context.repository,
    day,
    context.patient.id,
    context.mode,
    context.usesDemoFixture,
  );
}

export async function saveCheckInAction(input: unknown): Promise<PatientSnapshot> {
  const checkIn = parseCheckIn(input, 14);
  const context = await getPatientContext();
  await processCheckIn(
    context.repository,
    context.patient,
    context.actorId,
    checkIn,
    context.usesDemoFixture,
  );
  return reload(context, checkIn.day);
}

export async function saveBarrierAction(dayValue: unknown, barrierValue: unknown): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const barrier = findId(barrierValue, BARRIER_IDS, "Barrier");
  const context = await getPatientContext();
  const snapshot = await reload(context, day);
  const currentDay = snapshot.days[day - 1];
  if (!currentDay?.checkIn || currentDay.missedDays < 2) {
    throw new Error("Barrier selection is available only when returning after a gap.");
  }
  const existingBarrier = snapshot.barriers.find((record) => record.day === day);
  if (existingBarrier) throw new Error("A barrier has already been saved for this check-in.");
  await context.repository.saveBarrier(context.patient.id, {
    day,
    barrier,
    responseId: barrier,
  });
  return reload(context, day);
}

export async function saveActionAction(
  dayValue: unknown,
  actionValue: unknown,
  done: unknown,
): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const actionType = findId(actionValue, ACTION_IDS, "Action");
  if (typeof done !== "boolean") throw new TypeError("Action completion must be boolean.");
  const context = await getPatientContext();
  const snapshot = await reload(context, day);
  if (!getDailyActions(snapshot, day).includes(actionType)) {
    throw new Error("This action is not part of today's plan.");
  }
  await context.repository.saveAction(context.patient.id, { day, actionType, done });
  return reload(context, day);
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
  const context = await getPatientContext();
  await context.repository.setConsent(context.patient.id, consentPurpose, granted);
  return reload(context, day);
}

export async function requestRamadanAction(dayValue: unknown): Promise<PatientSnapshot> {
  const day = parseDay(dayValue);
  const context = await getPatientContext();
  const requests = await context.repository.listRamadanRequests(context.patient.id);
  if (requests.some(({ status }) => status === "pending" || status === "cleared")) {
    throw new Error("A pending or cleared Ramadan request already exists.");
  }
  await context.repository.createRamadanRequest(context.patient.id);
  return reload(context, day);
}
