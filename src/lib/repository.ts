import type { ActionId, BarrierId, CheckIn, Locale } from "@/engine/types";
import type { AlertCondition } from "@/engine/alerts";

export type ConsentPurpose = "share_with_care_team" | "caregiver_access" | "whatsapp_reminders";
export type RamadanStatus = "pending" | "cleared" | "declined";

export interface Patient {
  id: string;
  pseudonym: string;
  diagnosis: string;
  regimen: string;
  cycleStart: string;
  baselineWeightKg: number;
  targets: { caloriesKcal?: number; proteinGrams?: number };
  likes: string[];
  budget: number;
  locale: Locale;
}

export interface Plan {
  patientId: string;
  version: number;
  items: ActionId[];
  note: string | null;
  status: "approved";
  approvedBy: string;
  approvedAt: string;
}

export interface Alert {
  id: string;
  patientId: string;
  kind: "nutrition_decline" | "engagement_drop" | "red_flag";
  severity: string;
  state: "open" | "reviewed";
  evidence: unknown;
  createdAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export type AlertSignal =
  | { kind: "nutrition_decline"; severity: "review"; evidence: { throughDay: number; conditions: Pick<AlertCondition, "id" | "value" | "threshold" | "met" | "sourceDays">[] } }
  | { kind: "engagement_drop"; severity: "routine"; evidence: { sourceDay: number; returnDay: number; missedDays: number; lastIntakePercent: number } }
  | { kind: "red_flag"; severity: "urgent"; evidence: { day: number; flags: NonNullable<CheckIn["redFlags"]> } };

export interface CheckInWrite {
  patientId: string;
  actorId: string;
  previous: CheckIn[];
  checkIn: CheckIn;
  signals: AlertSignal[];
}

export class WriteConflict extends Error {}

export interface RamadanRequest {
  id: string;
  patientId: string;
  status: RamadanStatus;
  decidedBy: string | null;
  decidedAt: string | null;
}

export interface ActionRecord {
  day: number;
  actionType: ActionId;
  done: boolean;
}

export interface BarrierRecord {
  day: number;
  barrier: BarrierId;
  responseId: string;
}

export interface Repository {
  listPatients(): Promise<Patient[]>;
  listCheckIns(patientId: string): Promise<CheckIn[]>;
  saveCheckIn(patientId: string, checkIn: CheckIn): Promise<void>;
  recordCheckIn(write: CheckInWrite): Promise<Alert[]>;
  getConsents(patientId: string): Promise<Partial<Record<ConsentPurpose, boolean>>>;
  setConsent(patientId: string, purpose: ConsentPurpose, granted: boolean): Promise<void>;
  countActiveCaregiverLinks(patientId: string): Promise<number>;
  listCaregiverPatientIds(caregiverUserId: string): Promise<string[]>;
  listBarriers(patientId: string): Promise<BarrierRecord[]>;
  saveBarrier(patientId: string, barrier: BarrierRecord): Promise<void>;
  listActions(patientId: string): Promise<ActionRecord[]>;
  saveAction(patientId: string, action: ActionRecord): Promise<void>;
  listPlans(patientId: string): Promise<Plan[]>;
  approvePlan(plan: Plan): Promise<void>;
  listAlerts(patientId: string): Promise<Alert[]>;
  reviewAlert(patientId: string, alertId: string, reviewedBy: string, reviewedAt: string): Promise<void>;
  listRamadanRequests(patientId: string): Promise<RamadanRequest[]>;
  createRamadanRequest(patientId: string): Promise<void>;
  decideRamadanRequest(id: string, status: "cleared" | "declined", decidedBy: string, decidedAt: string): Promise<void>;
}
