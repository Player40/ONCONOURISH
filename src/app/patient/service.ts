import { DEMO_DAYS } from "@/data/days";
import { DEMO_PATIENT_IDS } from "@/lib/demo-repository";
import { getRepository } from "@/lib/repository-factory";
import type {
  ActionRecord,
  BarrierRecord,
  ConsentPurpose,
  Patient,
  Plan,
  RamadanRequest,
  Repository,
} from "@/lib/repository";
import { buildDailyPlan, evaluateCheckIn } from "@/engine";
import type { ActionId, CheckIn } from "@/engine/types";

export interface PatientDayView {
  readonly day: number;
  readonly checkIn: CheckIn | null;
  readonly actionsOffered: readonly ActionId[];
  readonly actionsCompleted: readonly ActionId[];
  readonly missedDays: number;
  readonly lastIntakeBeforeGap?: number;
}

export interface PatientSnapshot {
  readonly patient: Patient;
  readonly activeDay: number;
  readonly days: readonly PatientDayView[];
  readonly consents: Partial<Record<ConsentPurpose, boolean>>;
  readonly barriers: readonly BarrierRecord[];
  readonly plans: readonly Plan[];
  readonly ramadanRequests: readonly RamadanRequest[];
}

export function getPatientRepository(): Repository {
  const { repository, mode } = getRepository({ demo: true });
  if (mode !== "demo") {
    throw new Error("The patient demo is restricted to synthetic demo mode.");
  }
  return repository;
}

function countMissedDays(checkIns: ReadonlyMap<number, CheckIn>, day: number): number {
  let cursor = checkIns.has(day) ? day - 1 : day;
  let missed = 0;
  while (cursor > 0 && !checkIns.has(cursor)) {
    missed += 1;
    cursor -= 1;
  }
  return missed;
}

function getLastIntakeBeforeGap(checkIns: ReadonlyMap<number, CheckIn>, day: number): number | undefined {
  let cursor = checkIns.has(day) ? day - 1 : day;
  while (cursor > 0 && !checkIns.has(cursor)) cursor -= 1;
  return cursor > 0 ? checkIns.get(cursor)?.intakePercent : undefined;
}

function getActiveDay(day: number): number {
  if (!Number.isInteger(day) || day < 1 || day > DEMO_DAYS.length) {
    throw new RangeError(`Demo day must be between 1 and ${DEMO_DAYS.length}.`);
  }
  return day;
}

export async function buildPatientSnapshot(repository: Repository, requestedDay = 9): Promise<PatientSnapshot> {
  const activeDay = getActiveDay(requestedDay);
  const [
    patients,
    checkIns,
    actionRecords,
    consents,
    barriers,
    plans,
    ramadanRequests,
  ] = await Promise.all([
    repository.listPatients(),
    repository.listCheckIns(DEMO_PATIENT_IDS.layla),
    repository.listActions(DEMO_PATIENT_IDS.layla),
    repository.getConsents(DEMO_PATIENT_IDS.layla),
    repository.listBarriers(DEMO_PATIENT_IDS.layla),
    repository.listPlans(DEMO_PATIENT_IDS.layla),
    repository.listRamadanRequests(DEMO_PATIENT_IDS.layla),
  ]);
  const patient = patients.find(({ id }) => id === DEMO_PATIENT_IDS.layla);
  if (!patient) throw new Error("The synthetic Layla demo profile is unavailable.");

  const checkInsByDay = new Map(checkIns.map((checkIn) => [checkIn.day, checkIn]));
  const barriersByDay = new Map(barriers.map((barrier) => [barrier.day, barrier]));
  const actionsByDay = new Map<number, ActionRecord[]>();
  for (const action of actionRecords) {
    const actions = actionsByDay.get(action.day) ?? [];
    actions.push(action);
    actionsByDay.set(action.day, actions);
  }

  const days = DEMO_DAYS.map((demoDay): PatientDayView => {
    const checkIn = checkInsByDay.get(demoDay.day) ?? null;
    const missedDays = countMissedDays(checkInsByDay, demoDay.day);
    const storedActions = actionsByDay.get(demoDay.day) ?? [];
    const barrier = barriersByDay.get(demoDay.day);
    const urgent = checkIn ? evaluateCheckIn(checkIn).urgent : false;
    const generatedPlan = checkIn && !demoDay.logged && !urgent
      ? buildDailyPlan({ missedDays, ...(barrier ? { selectedBarrier: barrier.barrier } : {}) })
      : undefined;
    const actionsOffered = urgent
      ? []
      : demoDay.logged
      ? [...demoDay.actionsOffered]
      : generatedPlan?.actions.map(({ id }) => id) ?? [];
    const actionsCompleted = storedActions.length > 0
      ? storedActions.filter(({ done }) => done).map(({ actionType }) => actionType)
      : demoDay.logged
        ? [...demoDay.actionsCompleted]
        : [];

    return {
      day: demoDay.day,
      checkIn,
      actionsOffered,
      actionsCompleted,
      missedDays,
      lastIntakeBeforeGap: getLastIntakeBeforeGap(checkInsByDay, demoDay.day),
    };
  });

  return {
    patient,
    activeDay,
    days,
    consents,
    barriers,
    plans,
    ramadanRequests,
  };
}

export async function getPatientSnapshot(day = 9): Promise<PatientSnapshot> {
  return buildPatientSnapshot(getPatientRepository(), day);
}
