import { ACTION_IDS, BARRIER_IDS, RED_FLAG_IDS, SYMPTOM_IDS } from "@/engine/types";
import type { CheckIn } from "@/engine/types";
import type { ActionRecord, Alert, BarrierRecord, ConsentPurpose, Patient, Plan, RamadanRequest, Repository } from "./repository";

type Row = Record<string, unknown>;

function row(value: unknown): Row {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Invalid database row.");
  return value as Row;
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid database string.");
  return value;
}

function nullableString(value: unknown): string | null {
  return value === null ? null : string(value);
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Invalid database number.");
  return value;
}

function choice<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== "string") throw new Error("Invalid database choice.");
  const found = choices.find((item) => item === value);
  if (found === undefined) throw new Error(`Unknown database choice: ${value}`);
  return found;
}

function list<T>(value: unknown, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value)) throw new Error("Invalid database array.");
  return value.map(parse);
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid database boolean.");
  return value;
}

function patient(value: unknown): Patient {
  const item = row(value);
  const targets = row(item.targets);
  return {
    id: string(item.id), pseudonym: string(item.pseudonym), diagnosis: string(item.dx),
    regimen: string(item.regimen), cycleStart: string(item.cycle_start),
    baselineWeightKg: number(item.baseline_weight_kg),
    targets: {
      ...(targets.caloriesKcal === undefined ? {} : { caloriesKcal: number(targets.caloriesKcal) }),
      ...(targets.proteinGrams === undefined ? {} : { proteinGrams: number(targets.proteinGrams) }),
    },
    likes: list(item.likes, string),
    budget: number(item.budget), locale: choice(item.locale, ["en", "ar"] as const),
  };
}

function checkIn(value: unknown): CheckIn {
  const item = row(value);
  const appetite = number(item.appetite);
  if (appetite !== 1 && appetite !== 2 && appetite !== 3 && appetite !== 4 && appetite !== 5) {
    throw new Error("Invalid database appetite.");
  }
  return {
    day: number(item.day),
    symptoms: list(item.symptoms, (entry) => choice(entry, SYMPTOM_IDS)),
    redFlags: list(item.red_flags, (entry) => choice(entry, RED_FLAG_IDS)),
    appetite,
    intakePercent: number(item.intake_pct),
    ...(item.weight_kg === null ? {} : { weightKg: number(item.weight_kg) }),
  };
}

function action(value: unknown): ActionRecord {
  const item = row(value);
  return { day: number(item.day), actionType: choice(item.action_type, ACTION_IDS), done: boolean(item.done) };
}

function plan(value: unknown): Plan {
  const item = row(value);
  return {
    patientId: string(item.patient_id), version: number(item.version),
    items: list(item.items, (entry) => choice(entry, ACTION_IDS)), note: nullableString(item.note),
    status: choice(item.status, ["approved"] as const), approvedBy: string(item.approved_by),
    approvedAt: string(item.approved_at),
  };
}

function alert(value: unknown): Alert {
  const item = row(value);
  return {
    id: string(item.id), patientId: string(item.patient_id),
    kind: choice(item.kind, ["nutrition_decline", "engagement_drop", "red_flag"] as const),
    severity: string(item.severity), state: choice(item.state, ["open", "reviewed"] as const),
    evidence: item.evidence, createdAt: string(item.created_at),
  };
}

function ramadanRequest(value: unknown): RamadanRequest {
  const item = row(value);
  return {
    id: string(item.id), patientId: string(item.patient_id),
    status: choice(item.status, ["pending", "cleared", "declined"] as const),
    decidedBy: nullableString(item.decided_by), decidedAt: nullableString(item.decided_at),
  };
}

export class SupabaseRepository implements Repository {
  private readonly base: string;

  constructor(url: string, private readonly anonKey: string, private readonly accessToken: string) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1"))) {
      throw new Error("Supabase URL must use HTTPS except on localhost.");
    }
    if (!anonKey || !accessToken) throw new Error("Supabase requires an anon key and authenticated access token.");
    this.base = `${parsed.origin}/rest/v1`;
  }

  private async request(table: string, query: Record<string, string>, method = "GET", body?: unknown, upsert = false): Promise<unknown[]> {
    const url = new URL(`${this.base}/${table}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url, {
      method,
      redirect: "error",
      headers: {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        Prefer: upsert ? "resolution=merge-duplicates,return=representation" : "return=representation",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) throw new Error(`Supabase ${method} ${table} failed (${response.status}): ${await response.text()}`);
    const result: unknown = await response.json();
    if (!Array.isArray(result)) throw new Error(`Supabase ${table} returned an invalid response.`);
    return result;
  }

  private async write(table: string, query: Record<string, string>, method: string, body: unknown, upsert = false): Promise<void> {
    const result = await this.request(table, query, method, body, upsert);
    if (result.length !== 1) throw new Error(`Supabase ${table} write affected ${result.length} rows.`);
  }

  async listPatients(): Promise<Patient[]> {
    return (await this.request("patients", { select: "id,pseudonym,dx,regimen,cycle_start,baseline_weight_kg,targets,likes,budget,locale" })).map(patient);
  }
  async listCheckIns(patientId: string): Promise<CheckIn[]> {
    return (await this.request("checkins", { select: "day,symptoms,red_flags,appetite,intake_pct,weight_kg", patient_id: `eq.${patientId}`, order: "day.asc" })).map(checkIn);
  }
  async saveCheckIn(patientId: string, input: CheckIn): Promise<void> {
    await this.write("checkins", { on_conflict: "patient_id,day" }, "POST", {
      patient_id: patientId, day: input.day, symptoms: input.symptoms, red_flags: input.redFlags ?? [],
      appetite: input.appetite, intake_pct: input.intakePercent, weight_kg: input.weightKg ?? null,
    }, true);
  }
  async getConsents(patientId: string): Promise<Partial<Record<ConsentPurpose, boolean>>> {
    const result: Partial<Record<ConsentPurpose, boolean>> = {};
    for (const value of await this.request("consents", { select: "purpose,granted", patient_id: `eq.${patientId}` })) {
      const item = row(value);
      result[choice(item.purpose, ["share_with_care_team", "caregiver_access", "whatsapp_reminders"] as const)] = boolean(item.granted);
    }
    return result;
  }
  async setConsent(patientId: string, purpose: ConsentPurpose, granted: boolean): Promise<void> {
    await this.write("consents", { on_conflict: "patient_id,purpose" }, "POST", {
      patient_id: patientId, purpose, granted, updated_at: new Date().toISOString(),
    }, true);
  }
  async listBarriers(patientId: string): Promise<BarrierRecord[]> {
    return (await this.request("barrier_events", { select: "day,barrier,response_id", patient_id: `eq.${patientId}` })).map((value) => {
      const item = row(value);
      return { day: number(item.day), barrier: choice(item.barrier, BARRIER_IDS), responseId: string(item.response_id) };
    });
  }
  async saveBarrier(patientId: string, barrier: BarrierRecord): Promise<void> {
    await this.write("barrier_events", {}, "POST", {
      patient_id: patientId, day: barrier.day, barrier: barrier.barrier, response_id: barrier.responseId,
    });
  }
  async listActions(patientId: string): Promise<ActionRecord[]> {
    return (await this.request("actions_offered", { select: "day,action_type,done", patient_id: `eq.${patientId}` })).map(action);
  }
  async saveAction(patientId: string, item: ActionRecord): Promise<void> {
    await this.write("actions_offered", { on_conflict: "patient_id,day,action_type" }, "POST", {
      patient_id: patientId, day: item.day, action_type: item.actionType, done: item.done,
    }, true);
  }
  async listPlans(patientId: string): Promise<Plan[]> {
    return (await this.request("plans", { select: "patient_id,version,items,note,status,approved_by,approved_at", patient_id: `eq.${patientId}`, status: "eq.approved", order: "version.asc" })).map(plan);
  }
  async approvePlan(item: Plan): Promise<void> {
    await this.write("plans", {}, "POST", {
      patient_id: item.patientId, version: item.version, items: item.items, note: item.note,
      status: item.status, approved_by: item.approvedBy, approved_at: item.approvedAt,
    });
  }
  async listAlerts(patientId: string): Promise<Alert[]> {
    return (await this.request("alerts", { select: "id,patient_id,kind,severity,state,evidence,created_at", patient_id: `eq.${patientId}` })).map(alert);
  }
  async listRamadanRequests(patientId: string): Promise<RamadanRequest[]> {
    return (await this.request("ramadan_requests", { select: "id,patient_id,status,decided_by,decided_at", patient_id: `eq.${patientId}` })).map(ramadanRequest);
  }
  async createRamadanRequest(patientId: string): Promise<void> {
    await this.write("ramadan_requests", {}, "POST", { patient_id: patientId, status: "pending" });
  }
  async decideRamadanRequest(id: string, status: "cleared" | "declined", decidedBy: string, decidedAt: string): Promise<void> {
    await this.write("ramadan_requests", { id: `eq.${id}`, status: "eq.pending" }, "PATCH", {
      status, decided_by: decidedBy, decided_at: decidedAt,
    });
  }
}
