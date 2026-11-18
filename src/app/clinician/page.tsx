import { notFound, redirect } from "next/navigation";
import { authorizePatient, visiblePatients, WorkflowError } from "@/lib/clinical-workflow";
import { getSession, hasAccessCookie } from "@/lib/session";
import { ClinicianDashboard } from "./dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clinician workspace | OncoNourish", robots: "noindex, nofollow" };

export default async function ClinicianPage({ searchParams }: { searchParams: Promise<{ patientId?: string }> }) {
  const session = await getSession();
  if (!session) redirect(await hasAccessCookie() ? "/login?error=verify" : "/login");
  if (session.role !== "clinician") return <main className="app-shell"><h1>Clinician access required</h1><p>Your role cannot open this workspace.</p><a href="/login">Back to login</a></main>;
  const { patientId } = await searchParams;
  if (patientId !== undefined) {
    try {
      await authorizePatient(session, patientId, ["clinician"]);
    } catch (error) {
      if (error instanceof WorkflowError) notFound();
      throw error;
    }
  }
  const repository = session.repository;
  const patients = await visiblePatients(session, ["clinician"]);
  const reviews = await Promise.all(patients.map(async (patient) => {
    const [checkIns, alerts, requests] = await Promise.all([
      repository.listCheckIns(patient.id), repository.listAlerts(patient.id), repository.listRamadanRequests(patient.id),
    ]);
    return { patient, checkIns, alerts, requests };
  }));
  const selected = patientId ? reviews.find(({ patient }) => patient.id === patientId.toLowerCase()) : reviews[0];
  if (patientId && !selected) notFound();
  const plans = selected ? await repository.listPlans(selected.patient.id) : [];
  return <ClinicianDashboard reviews={reviews} selected={selected} latestPlan={plans.sort((a, b) => b.version - a.version)[0]} demo={session.mode === "demo"} />;
}
