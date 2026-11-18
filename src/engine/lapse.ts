import { ENGAGEMENT_THRESHOLDS } from "@/data/rules";
import type { ConsentSettings } from "@/engine/types";

export interface LapseResponse {
  readonly consecutiveMissedDays: number;
  readonly sendGentleNudge: boolean;
  readonly shrinkGoal: boolean;
  readonly welcomeBackWithoutCatchUp: boolean;
  readonly askBarrier: boolean;
  readonly offerWhatsAppReminder: boolean;
  readonly raiseRoutineFlag: boolean;
  readonly mayContactCaregiver: boolean;
}

export function getLapseResponse(
  consecutiveMissedDays: number,
  lastLoggedIntakePercent: number | undefined,
  consents: ConsentSettings,
): LapseResponse {
  if (!Number.isInteger(consecutiveMissedDays) || consecutiveMissedDays < 0) {
    throw new RangeError("Missed days must be a non-negative integer.");
  }
  if (
    lastLoggedIntakePercent !== undefined &&
    (!Number.isFinite(lastLoggedIntakePercent) || lastLoggedIntakePercent < 0 || lastLoggedIntakePercent > 100)
  ) {
    throw new RangeError("Last logged intake must be between 0 and 100 percent.");
  }

  const returningAfterGap = consecutiveMissedDays >= ENGAGEMENT_THRESHOLDS.shrinkPlanAfterMissedDays;
  return {
    consecutiveMissedDays,
    sendGentleNudge: consecutiveMissedDays >= ENGAGEMENT_THRESHOLDS.nudgeAfterMissedDays,
    shrinkGoal: returningAfterGap,
    welcomeBackWithoutCatchUp: returningAfterGap,
    askBarrier: returningAfterGap,
    offerWhatsAppReminder:
      returningAfterGap && consents.whatsappReminders,
    raiseRoutineFlag:
      consecutiveMissedDays >= ENGAGEMENT_THRESHOLDS.routineFlagAfterMissedDays &&
      lastLoggedIntakePercent !== undefined &&
      lastLoggedIntakePercent < ENGAGEMENT_THRESHOLDS.routineFlagRequiresLastIntakeBelowPercent,
    mayContactCaregiver: consents.caregiverContact,
  };
}
