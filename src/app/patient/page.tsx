import { redirect } from "next/navigation";
import { getSession, hasAccessCookie } from "@/lib/session";
import { getPatientSnapshot } from "./service";
import PatientExperience from "./patient-experience";

export const dynamic = "force-dynamic";

export default async function PatientPage() {
  const session = await getSession();
  if (!session && await hasAccessCookie()) redirect("/login?error=verify");
  if (session?.mode === "supabase" && session.role === "clinician") redirect("/clinician");
  if (session?.mode === "supabase" && session.role === "caregiver") redirect("/caregiver");
  const snapshot = await getPatientSnapshot();
  return <PatientExperience initialSnapshot={snapshot} />;
}
