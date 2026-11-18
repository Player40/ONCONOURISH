import type { ActionId, BarrierId, CheckIn, Locale } from "@/engine/types";

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
}

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
  getConsents(patientId: string): Promise<Partial<Record<ConsentPurpose, boolean>>>;
  setConsent(patientId: string, purpose: ConsentPurpose, granted: boolean): Promise<void>;
  listBarriers(patientId: string): Promise<BarrierRecord[]>;
  saveBarrier(patientId: string, barrier: BarrierRecord): Promise<void>;
  listActions(patientId: string): Promise<ActionRecord[]>;
  saveAction(patientId: string, action: ActionRecord): Promise<void>;
  listPlans(patientId: string): Promise<Plan[]>;
  approvePlan(plan: Plan): Promise<void>;
  listAlerts(patientId: string): Promise<Alert[]>;
  listRamadanRequests(patientId: string): Promise<RamadanRequest[]>;
  createRamadanRequest(patientId: string): Promise<void>;
  decideRamadanRequest(id: string, status: "cleared" | "declined", decidedBy: string, decidedAt: string): Promise<void>;
}
