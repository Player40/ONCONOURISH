import { checkGuardrailText } from "@/engine";
import { ACTION_IDS } from "@/engine/types";
import type { AppRole } from "@/data/roles";
import { processCheckIn } from "./check-in-workflow";
import { answerQuestion } from "./question-workflow";
import { WriteConflict, type Patient, type Plan } from "./repository";
import { UUID, type Session } from "./session";
import { findId, parseCheckIn, parseIdList } from "./workflow-input";

export class WorkflowError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function visiblePatients(session: Session, roles: readonly AppRole[]): Promise<Patient[]> {
  if (!roles.includes(session.role)) throw new WorkflowError(403, "This role cannot access the workflow.");
  const patients = await session.repository.listPatients();
  // Supabase's session-bound patient listing enforces ownership or assignment + consent.
  if (session.mode !== "demo") return patients;
  const consent = await Promise.all(patients.map(({ id }) => session.repository.getConsents(id)));
  return patients.filter((_, index) => consent[index].share_with_care_team === true);
}

export async function authorizePatient(session: Session, id: unknown, roles: readonly AppRole[]): Promise<Patient> {
  if (typeof id !== "string" || !UUID.test(id)) throw new WorkflowError(400, "Invalid patient ID.");
  const patient = (await visiblePatients(session, roles)).find((candidate) => candidate.id === id.toLowerCase());
  if (!patient) throw new WorkflowError(404, "Patient not found.");
  return patient;
}

export async function submitCheckIn(session: Session, body: Record<string, unknown>) {
  const patient = await authorizePatient(session, body.patientId, ["patient"]);
  return processCheckIn(session.repository, patient, session.actorId, parseCheckIn(body.checkIn, 2_147_483_647));
}

export async function ask(session: Session, body: Record<string, unknown>) {
  const patient = await authorizePatient(session, body.patientId, ["patient"]);
  const locale = findId(body.locale, ["en", "ar"] as const, "Locale");
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 2000) {
    throw new WorkflowError(400, "Question must contain 1–2000 characters.");
  }
  const history = await session.repository.listCheckIns(patient.id);
  const latest = history.reduce<(typeof history)[number] | undefined>((a, b) => !a || a.day < b.day ? b : a, undefined);
  return answerQuestion(body.text, locale, latest);
}

export async function approvePlan(session: Session, body: Record<string, unknown>): Promise<Plan> {
  const patient = await authorizePatient(session, body.patientId, ["clinician"]);
  const items = parseIdList(body.items, "Plan actions", ACTION_IDS);
  if (body.note != null && (typeof body.note !== "string" || body.note.length > 500)) {
    throw new WorkflowError(400, "Intervention note must be at most 500 characters.");
  }
  const note = typeof body.note === "string" ? body.note.trim() || null : null;
  if (note && checkGuardrailText(note, patient.locale).id !== "IN-SCOPE") {
    throw new WorkflowError(400, "Keep the note to a synthetic nutrition intervention summary.");
  }
  const prior = await session.repository.listPlans(patient.id);
  const plan: Plan = { patientId: patient.id, items, note, status: "approved",
    version: Math.max(0, ...prior.map(({ version }) => version)) + 1,
    approvedBy: session.actorId, approvedAt: new Date().toISOString(),
  };
  await session.repository.approvePlan(plan);
  return plan;
}

export async function reviewAlert(session: Session, body: Record<string, unknown>) {
  const patient = await authorizePatient(session, body.patientId, ["clinician"]);
  if (typeof body.alertId !== "string" || !UUID.test(body.alertId)) {
    throw new WorkflowError(400, "Invalid alert ID.");
  }
  const alert = (await session.repository.listAlerts(patient.id)).find(({ id }) => id === body.alertId);
  if (!alert) throw new WorkflowError(404, "Alert not found.");
  if (alert.state !== "open") throw new WriteConflict("Alert is already reviewed.");
  const reviewedAt = new Date().toISOString();
  await session.repository.reviewAlert(patient.id, alert.id, session.actorId, reviewedAt);
  return { ...alert, state: "reviewed" as const, reviewedBy: session.actorId, reviewedAt };
}

export async function updateRamadan(session: Session, body: Record<string, unknown>) {
  const action = findId(body.action, ["request", "clear", "decline"] as const, "Ramadan action");
  const patient = await authorizePatient(session, body.patientId, [action === "request" ? "patient" : "clinician"]);
  const requests = await session.repository.listRamadanRequests(patient.id);
  if (action === "request") {
    if (requests.some(({ status }) => status !== "declined")) throw new WriteConflict();
    await session.repository.createRamadanRequest(patient.id);
    const request = (await session.repository.listRamadanRequests(patient.id)).find(({ id }) => !requests.some((prior) => prior.id === id));
    if (!request) throw new WriteConflict();
    return request;
  }
  const pending = requests.find(({ status }) => status === "pending");
  if (!pending || (body.requestId !== undefined && body.requestId !== pending.id)) throw new WriteConflict();
  const status = action === "clear" ? "cleared" : "declined";
  const decidedAt = new Date().toISOString();
  await session.repository.decideRamadanRequest(pending.id, status, session.actorId, decidedAt);
  return { ...pending, status, decidedAt, decidedBy: session.actorId };
}
