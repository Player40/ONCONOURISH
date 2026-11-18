import { getPatientSnapshot } from "./service";
import PatientExperience from "./patient-experience";

export const dynamic = "force-dynamic";

export default async function PatientPage() {
  const snapshot = await getPatientSnapshot();
  return <PatientExperience initialSnapshot={snapshot} />;
}
