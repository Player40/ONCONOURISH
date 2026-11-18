import { PHASE_WINDOWS } from "@/data/rules";
import type { PhaseId } from "@/engine/types";

export interface CyclePhase {
  readonly id: PhaseId;
  readonly startDay: number;
  readonly endDay: number | null;
  readonly label: { readonly en: string; readonly ar: string };
}

export function getPhaseForCycleDay(day: number): CyclePhase {
  if (!Number.isInteger(day) || day < 1) {
    throw new RangeError("Cycle day must be a positive integer.");
  }

  const phase = PHASE_WINDOWS.find(
    ({ startDay, endDay }) => day >= startDay && (endDay === null || day <= endDay),
  );
  if (!phase) {
    throw new RangeError(`No phase is configured for cycle day ${day}.`);
  }
  return phase;
}
