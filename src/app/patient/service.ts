import { DEMO_DAYS } from "@/data/days";
import { DEMO_LAYLA_OWNER, DEMO_PATIENT_IDS, demoRepository } from "@/lib/demo-repository";
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
import { getSession, hasAccessCookie } from "@/lib/session";

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
  readonly mode: "demo" | "supabase";
  readonly activeDay: number;
  readonly days: readonly PatientDayView[];
  readonly consents: Partial<Record<ConsentPurpose, boolean>>;
  readonly activeCaregiverLinks: number;
  readonly barriers: readonly BarrierRecord[];
  readonly plans: readonly Plan[];
  readonly ramadanRequests: readonly RamadanRequest[];
}

export interface PatientContext {
  readonly repository: Repository;
  readonly patient: Patient;
  readonly actorId: string;
  readonly mode: "demo" | "supabase";
  readonly usesDemoFixture: boolean;
}

export async function getPatientContext(): Promise<PatientContext> {
  const session = await getSession();
  if (!session && await hasAccessCookie()) {
    throw new Error("Your sign-in is no longer valid. Return to the sign-in page and try again.");
  }
  if (!session || session.mode === "demo") {
    const patient = (await demoRepository.listPatients()).find(({ id }) => id === DEMO_PATIENT_IDS.layla);
    if (!patient) throw new Error("Synthetic patient not found.");
    return {
      repository: demoRepository,
      patient,
      actorId: DEMO_LAYLA_OWNER,
      mode: "demo",
      usesDemoFixture: true,
    };
  }
  if (session.role !== "patient") throw new Error("Patient access is required to use this workspace.");
  const patients = await session.repository.listPatients();
  if (patients.length !== 1) throw new Error("This synthetic patient account must be linked to exactly one patient record.");
  return {
    repository: session.repository,
    patient: patients[0],
    actorId: session.actorId,
    mode: "supabase",
    usesDemoFixture: false,
  };
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

export async function buildPatientSnapshot(
  repository: Repository,
  requestedDay = 9,
  patientId: string = DEMO_PATIENT_IDS.layla,
  mode: "demo" | "supabase" = "demo",
  usesDemoFixture = mode === "demo",
): Promise<PatientSnapshot> {
  const activeDay = getActiveDay(requestedDay);
  const [
    patients,
    checkIns,
    actionRecords,
    consents,
    activeCaregiverLinks,
    barriers,
    plans,
    ramadanRequests,
  ] = await Promise.all([
    repository.listPatients(),
    repository.listCheckIns(patientId),
    repository.listActions(patientId),
    repository.getConsents(patientId),
    repository.countActiveCaregiverLinks(patientId),
    repository.listBarriers(patientId),
    repository.listPlans(patientId),
    repository.listRamadanRequests(patientId),
  ]);
  const patient = patients.find(({ id }) => id === patientId);
  if (!patient) throw new Error("The patient profile is unavailable.");

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
    const generatedPlan = checkIn && (!usesDemoFixture || !demoDay.logged) && !urgent
      ? buildDailyPlan({ missedDays, ...(barrier ? { selectedBarrier: barrier.barrier } : {}) })
      : undefined;
    const actionsOffered = urgent
      ? []
      : usesDemoFixture && demoDay.logged
      ? [...demoDay.actionsOffered]
      : generatedPlan?.actions.map(({ id }) => id) ?? [];
    const actionsCompleted = storedActions.length > 0
      ? storedActions.filter(({ done }) => done).map(({ actionType }) => actionType)
      : usesDemoFixture && demoDay.logged
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
    mode,
    activeDay,
    days,
    consents,
    activeCaregiverLinks,
    barriers,
    plans,
    ramadanRequests,
  };
}

export async function getPatientSnapshot(day = 9): Promise<PatientSnapshot> {
  const context = await getPatientContext();
  return buildPatientSnapshot(
    context.repository,
    day,
    context.patient.id,
    context.mode,
    context.usesDemoFixture,
  );
}
