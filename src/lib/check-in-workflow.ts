import { evaluateCheckIn, evaluateNutritionAlert, getLapseResponse } from "@/engine";
import type { CheckIn } from "@/engine/types";
import { type AlertSignal, type Patient, type Repository } from "./repository";

export async function processCheckIn(repository: Repository, patient: Patient, actorId: string, checkIn: CheckIn, isDemo = false) {
  const previous = await repository.listCheckIns(patient.id);
  if (![25, 50, 75, 100].includes(checkIn.intakePercent) &&
      !(isDemo && previous.some((entry) => entry.day === checkIn.day && entry.intakePercent === checkIn.intakePercent))) {
    throw new RangeError("New check-ins must use 25, 50, 75, or 100 percent intake.");
  }
  const history = [...previous.filter(({ day }) => day < checkIn.day), checkIn].sort((a, b) => a.day - b.day);
  const signals: AlertSignal[] = [];
  const evaluation = evaluateCheckIn(checkIn, patient.locale);
  if (evaluation.urgent && checkIn.redFlags?.length) {
    signals.push({ kind: "red_flag", severity: "urgent", evidence: { day: checkIn.day, flags: checkIn.redFlags } });
  }
  const nutrition = evaluateNutritionAlert(history, patient.baselineWeightKg);
  if (nutrition.status === "alert") {
    signals.push({ kind: "nutrition_decline", severity: "review", evidence: {
      throughDay: checkIn.day,
      conditions: nutrition.conditions.map(({ id, value, threshold, met, sourceDays }) => ({ id, value, threshold, met, sourceDays })),
    } });
  }
  const last = history.at(-2);
  if (last) {
    const missedDays = checkIn.day - last.day - 1;
    if (getLapseResponse(missedDays, last.intakePercent, { whatsappReminders: false, caregiverContact: false }).raiseRoutineFlag) {
      signals.push({ kind: "engagement_drop", severity: "routine", evidence: {
        sourceDay: last.day, returnDay: checkIn.day, missedDays, lastIntakePercent: last.intakePercent,
      } });
    }
  }
  const alerts = await repository.recordCheckIn({ patientId: patient.id, actorId, previous, checkIn, signals });
  return { checkIn, alerts, urgent: evaluation.urgent, message: evaluation.message };
}
