import { DEMO_DAYS } from "@/data/days";
import type { CheckIn } from "@/engine/types";
import type { ActionRecord, Alert, BarrierRecord, ConsentPurpose, Patient, Plan, RamadanRequest, Repository } from "./repository";

export const DEMO_PATIENT_IDS = {
  layla: "20000000-0000-4000-8000-000000000001",
  omar: "20000000-0000-4000-8000-000000000002",
  priya: "20000000-0000-4000-8000-000000000003",
} as const;

const patients: Patient[] = [
  { id: DEMO_PATIENT_IDS.layla, pseudonym: "Layla M. (synthetic)", diagnosis: "Breast cancer", regimen: "AC-T chemotherapy, cycle 2", cycleStart: "2026-01-01", baselineWeightKg: 68, targets: { caloriesKcal: 1900, proteinGrams: 70 }, likes: ["laban", "dates", "khichdi", "ricepud"], budget: 2, locale: "en" },
  { id: DEMO_PATIENT_IDS.omar, pseudonym: "Omar K. (synthetic)", diagnosis: "Colorectal cancer", regimen: "PLACEHOLDER: pending dietitian review", cycleStart: "2026-01-01", baselineWeightKg: 75, targets: {}, likes: [], budget: 2, locale: "en" },
  { id: DEMO_PATIENT_IDS.priya, pseudonym: "Priya S. (synthetic)", diagnosis: "Lung cancer", regimen: "PLACEHOLDER: pending dietitian review", cycleStart: "2026-01-01", baselineWeightKg: 60, targets: {}, likes: [], budget: 2, locale: "en" },
];

export class DemoRepository implements Repository {
  private readonly patients = structuredClone(patients);
  private readonly checkIns = new Map<string, CheckIn[]>([
    [DEMO_PATIENT_IDS.layla, DEMO_DAYS.filter((day) => day.logged).map(({ day, symptoms, appetite, intakePercent, weightKg }) => ({
      day, symptoms: [...symptoms], appetite, intakePercent, weightKg,
    }))],
    [DEMO_PATIENT_IDS.omar, [
      { day: 1, symptoms: [], appetite: 4, intakePercent: 80, weightKg: 75 },
      { day: 2, symptoms: [], appetite: 4, intakePercent: 85, weightKg: 75 },
    ]],
    [DEMO_PATIENT_IDS.priya, [
      { day: 1, symptoms: [], appetite: 3, intakePercent: 55, weightKg: 60 },
      { day: 2, symptoms: [], appetite: 2, intakePercent: 50, weightKg: 59.5 },
      { day: 3, symptoms: [], appetite: 2, intakePercent: 50, weightKg: 58.8 },
    ]],
  ]);
  private readonly actions = new Map<string, ActionRecord[]>([
    [DEMO_PATIENT_IDS.layla, DEMO_DAYS.filter((day) => day.logged).flatMap((day) =>
      day.actionsOffered.map((action) => ({
        day: day.day,
        actionType: action,
        done: (day.actionsCompleted as readonly string[]).includes(action),
      })),
    )],
  ]);
  private readonly consents = new Map<string, Partial<Record<ConsentPurpose, boolean>>>(
    patients.map(({ id }) => [id, { share_with_care_team: true, caregiver_access: false, whatsapp_reminders: false }]),
  );
  private readonly plans = new Map<string, Plan[]>();
  private readonly barriers = new Map<string, BarrierRecord[]>();
  private readonly alerts = new Map<string, Alert[]>();
  private readonly ramadan = new Map<string, RamadanRequest[]>();

  private assertPatient(patientId: string): void {
    if (!this.patients.some(({ id }) => id === patientId)) throw new Error("Unknown demo patient.");
  }

  async listPatients(): Promise<Patient[]> { return structuredClone(this.patients); }
  async listCheckIns(patientId: string): Promise<CheckIn[]> {
    this.assertPatient(patientId);
    return structuredClone(this.checkIns.get(patientId) ?? []);
  }
  async saveCheckIn(patientId: string, checkIn: CheckIn): Promise<void> {
    this.assertPatient(patientId);
    const records = this.checkIns.get(patientId) ?? [];
    this.checkIns.set(patientId, [...records.filter(({ day }) => day !== checkIn.day), structuredClone(checkIn)].sort((a, b) => a.day - b.day));
  }
  async getConsents(patientId: string): Promise<Partial<Record<ConsentPurpose, boolean>>> {
    this.assertPatient(patientId);
    return structuredClone(this.consents.get(patientId) ?? {});
  }
  async setConsent(patientId: string, purpose: ConsentPurpose, granted: boolean): Promise<void> {
    this.assertPatient(patientId);
    this.consents.set(patientId, { ...this.consents.get(patientId), [purpose]: granted });
  }
  async listBarriers(patientId: string): Promise<BarrierRecord[]> {
    this.assertPatient(patientId);
    return structuredClone(this.barriers.get(patientId) ?? []);
  }
  async saveBarrier(patientId: string, barrier: BarrierRecord): Promise<void> {
    this.assertPatient(patientId);
    this.barriers.set(patientId, [...this.barriers.get(patientId) ?? [], structuredClone(barrier)]);
  }
  async listActions(patientId: string): Promise<ActionRecord[]> {
    this.assertPatient(patientId);
    return structuredClone(this.actions.get(patientId) ?? []);
  }
  async saveAction(patientId: string, action: ActionRecord): Promise<void> {
    this.assertPatient(patientId);
    const records = this.actions.get(patientId) ?? [];
    this.actions.set(patientId, [...records.filter((record) => record.day !== action.day || record.actionType !== action.actionType), structuredClone(action)]);
  }
  async listPlans(patientId: string): Promise<Plan[]> {
    this.assertPatient(patientId);
    return structuredClone(this.plans.get(patientId) ?? []);
  }
  async approvePlan(plan: Plan): Promise<void> {
    this.assertPatient(plan.patientId);
    const plans = this.plans.get(plan.patientId) ?? [];
    if (plan.version !== Math.max(0, ...plans.map(({ version }) => version)) + 1) {
      throw new Error("Plan version must be the next version.");
    }
    this.plans.set(plan.patientId, [...plans, structuredClone(plan)]);
  }
  async listAlerts(patientId: string): Promise<Alert[]> {
    this.assertPatient(patientId);
    return structuredClone(this.alerts.get(patientId) ?? []);
  }
  async listRamadanRequests(patientId: string): Promise<RamadanRequest[]> {
    this.assertPatient(patientId);
    return structuredClone(this.ramadan.get(patientId) ?? []);
  }
  async createRamadanRequest(patientId: string): Promise<void> {
    this.assertPatient(patientId);
    const requests = this.ramadan.get(patientId) ?? [];
    this.ramadan.set(patientId, [...requests, { id: crypto.randomUUID(), patientId, status: "pending", decidedBy: null, decidedAt: null }]);
  }
  async decideRamadanRequest(id: string, status: "cleared" | "declined", decidedBy: string, decidedAt: string): Promise<void> {
    for (const [patientId, requests] of this.ramadan) {
      const request = requests.find((entry) => entry.id === id);
      if (!request) continue;
      if (request.status !== "pending") throw new Error("Ramadan request is already decided.");
      this.ramadan.set(patientId, requests.map((entry) => entry.id === id ? { ...entry, status, decidedBy, decidedAt } : entry));
      return;
    }
    throw new Error("Unknown Ramadan request.");
  }
}

// Shared by server bundles in the same JavaScript process, never across processes.
const demoGlobal = globalThis as typeof globalThis & { onconourishDemoRepository?: DemoRepository };
export const demoRepository = demoGlobal.onconourishDemoRepository ??= new DemoRepository();
