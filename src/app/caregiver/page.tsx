import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { getSession, hasAccessCookie } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Caregiver view | OncoNourish", robots: "noindex, nofollow" };

export default async function CaregiverPage() {
  const session = await getSession();
  if (!session) redirect(await hasAccessCookie() ? "/login?error=verify" : "/login");
  if (session.role !== "caregiver") {
    return <main className="app-shell">
      <h1>Caregiver access required</h1>
      <p>Your role cannot open this read-only workspace.</p>
      <Link className="button" href="/login">Back to sign in</Link>
    </main>;
  }

  const patientIds = await session.repository.listCaregiverPatientIds(session.actorId);
  const sharedRecords = await Promise.all(patientIds.map(async (patientId, index) => ({
    label: `Shared record ${index + 1}`,
    checkIns: await session.repository.listCheckIns(patientId),
  })));

  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/login">OncoNourish</Link>
      <div className="row">
        <span className="badge">Read-only · synthetic data · not medical advice</span>
        {session.mode === "demo" && <Link className="button small" href="/patient">Patient demo</Link>}
        <form action={signOut}><button className="button small" type="submit">Sign out</button></form>
      </div>
    </header>
    <h1>Caregiver view</h1>
    {session.mode === "demo" && <p className="badge">Synthetic demo · not authenticated · state may reset</p>}
    <p className="muted">
      This view only displays check-ins shared by a patient with an active caregiver link and current consent.
      It does not provide food or medical advice.
    </p>
    {!sharedRecords.length && <section className="card">
      <h2>No check-ins are currently shared</h2>
      <p>A patient must have an active caregiver link and enable caregiver access before records appear here.</p>
      {session.mode === "demo" && <Link className="button" href="/patient">Open the patient demo to review its sharing controls</Link>}
    </section>}
    {sharedRecords.map(({ label, checkIns }) => <section className="card" key={label}>
      <h2>{label}</h2>
      {!checkIns.length && <p>No check-ins have been shared.</p>}
      {checkIns.length > 0 && <div className="clinician-table">
        <table>
          <thead><tr><th scope="col">Cycle day</th><th scope="col">Intake (%)</th><th scope="col">Symptoms</th><th scope="col">Urgent flags</th></tr></thead>
          <tbody>{checkIns.map((checkIn) => <tr key={checkIn.day}>
            <th scope="row">{checkIn.day}</th>
            <td>{checkIn.intakePercent}</td>
            <td>{checkIn.symptoms.map((id) => id.replaceAll("_", " ")).join(", ") || "None reported"}</td>
            <td>{checkIn.redFlags?.map((id) => id === "red_fever" ? "Fever or chills" : "Unable to keep fluids down").join(", ") || "None reported"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </section>)}
    <footer className="muted">Synthetic data only · Read-only access · Not medical advice</footer>
  </main>;
}
