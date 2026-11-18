import Link from "next/link";
import { evaluateNutritionAlert } from "@/engine";
import { RED_FLAG_IDS, type CheckIn } from "@/engine/types";
import type { Alert, Patient, Plan, RamadanRequest } from "@/lib/repository";
import { isRecord } from "@/lib/workflow-input";
import { signOut } from "@/app/login/actions";
import { AlertReviewControl, PlanControls, RamadanControls } from "./controls";

export interface PatientReview {
  patient: Patient;
  checkIns: CheckIn[];
  alerts: Alert[];
  requests: RamadanRequest[];
}

const conditionLabels = {
  intake: "Mean intake over the last 3 logged days is below 60%",
  weight: "Weight is down 2% or more from baseline",
  symptom: "Same symptom on 3 or more of the last 7 logged check-ins",
} as const;
const number = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : null;
const days = (v: unknown) => Array.isArray(v)
  ? v.slice(0, 7).map(number).filter((d) => d !== null && Number.isInteger(d) && d > 0) : [];
const state = ({ alerts, checkIns, patient }: PatientReview) => {
  const open = alerts.filter(({ state }) => state === "open");
  if (open.some(({ kind }) => kind === "red_flag")) return "Urgent flag";
  if (open.some(({ kind }) => kind === "nutrition_decline")) return "Review needed";
  if (open.some(({ kind }) => kind === "engagement_drop")) return "Engagement drop";
  const result = evaluateNutritionAlert(checkIns, patient.baselineWeightKg);
  return result.status === "alert" ? "Review indicated" : result.status === "watch" ? "Watch" : checkIns.length ? "No current signal" : "No check-ins";
};

function Evidence({ alert }: { alert: Alert }) {
  const evidence = isRecord(alert.evidence) ? alert.evidence : {};
  const title = { nutrition_decline: "Nutrition decline", engagement_drop: "Routine: engagement drop", red_flag: "Red flag reported" }[alert.kind];
  return <section className="card">
    <h3>{title} · {alert.state}</h3>
    {alert.kind === "red_flag" && <p>
      Source day: {number(evidence.day) ?? "Unavailable"}. {RED_FLAG_IDS.filter((id) =>
        Array.isArray(evidence.flags) && evidence.flags.includes(id)).map((id) => id === "red_fever" ? "Fever or chills" : "Unable to keep fluids down").join("; ")}
    </p>}
    {alert.kind === "engagement_drop" && <p>
      {number(evidence.missedDays) ?? "Unknown"} missed days · Last intake: {number(evidence.lastIntakePercent) ?? "unknown"}% ·
      Source day {number(evidence.sourceDay) ?? "unknown"}; return day {number(evidence.returnDay) ?? "unknown"}.
    </p>}
    {alert.kind === "nutrition_decline" && <>
      <p>PLACEHOLDER: pending dietitian review. All three conditions must hold.</p>
      <ul>{Object.entries(conditionLabels).map(([id, label]) => {
        const condition = (Array.isArray(evidence.conditions) ? evidence.conditions : []).find((item) => isRecord(item) && item.id === id);
        const value = number(condition?.value);
        return <li key={id}><strong>{label}</strong> — {condition?.met === true ? "Met" : "Not confirmed"}.
          Value: {value === null ? "Unavailable" : Number(value.toFixed(1))}{value !== null && id !== "symptom" ? "%" : ""}.
          Source days: {days(condition?.sourceDays).join(", ") || "unavailable"}.</li>;
      })}</ul>
    </>}
    <AlertReviewControl alert={alert} />
  </section>;
}

function History({ checkIns, demo }: { checkIns: CheckIn[]; demo: boolean }) {
  const end = demo ? Math.max(14, ...checkIns.map(({ day }) => day)) : Math.max(1, ...checkIns.map(({ day }) => day));
  const start = Math.max(1, end - 13);
  const history = Array.from({ length: end - start + 1 }, (_, index) => {
    const day = start + index;
    return { day, entry: checkIns.find((item) => item.day === day) };
  });
  const weights = history.flatMap(({ entry }) => entry?.weightKg == null ? [] : [entry.weightKg]);
  const min = weights.length ? Math.min(...weights) - 0.5 : 0;
  const max = weights.length ? Math.max(...weights) + 0.5 : 1;
  return <section className="card">
    <h3>Trends and symptom history</h3>
    <p className="muted small">Intake is a self-reported proxy. Hatched rows are missed days. Weight bars show change on a {min.toFixed(1)}–{max.toFixed(1)} kg scale.</p>
    <div className="clinician-table"><table>
      <thead><tr><th scope="col">Day</th><th scope="col">Weight (kg)</th><th scope="col">Intake (%)</th><th scope="col">Symptoms</th></tr></thead>
      <tbody>{history.map(({ day, entry }) => <tr key={day} className={entry ? undefined : "missed-day"}>
        <th scope="row">{day}</th>
        {entry ? <>
          <td>{entry.weightKg == null ? "Not recorded" : <><meter aria-label={`Day ${day} weight`} min={min} max={max} value={entry.weightKg} /> {entry.weightKg}</>}</td>
          <td><meter aria-label={`Day ${day} intake`} min={0} max={100} value={entry.intakePercent} /> {entry.intakePercent}</td>
          <td>{[...entry.symptoms, ...entry.redFlags ?? []].map((id) => id.replaceAll("_", " ")).join(", ") || "None reported"}</td>
        </> : <td colSpan={3}>No check-in</td>}
      </tr>)}</tbody>
    </table></div>
  </section>;
}

export function ClinicianDashboard({ reviews, selected, latestPlan, demo }: {
  reviews: PatientReview[]; selected?: PatientReview; latestPlan?: Plan; demo: boolean;
}) {
  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/login">OncoNourish</Link>
      <div className="row">{demo && <Link className="button" href="/patient">Patient demo</Link>}
        <form action={signOut}><button className="button" type="submit">{demo ? "Exit clinician demo" : "Sign out"}</button></form>
      </div>
    </header>
    <h1>Clinician workspace</h1>
    {demo && <p className="badge">Synthetic demo · not authenticated · state may reset</p>}
    <div className="clinician-grid">
      <aside>
        <nav className="card" aria-label="Assigned patients">
          <h2>Assigned patients</h2>
          {!reviews.length && <p>No assigned patients with sharing consent.</p>}
          {reviews.map((review) => <Link key={review.patient.id} className="button clinician-patient"
            href={`/clinician?patientId=${review.patient.id}`} aria-current={selected?.patient.id === review.patient.id ? "page" : undefined}>
            {review.patient.pseudonym} <span className="badge">{state(review)}</span>
          </Link>)}
        </nav>
        <section className="card"><h2>Ramadan clearance inbox</h2>
          {!reviews.some(({ requests }) => requests.some(({ status }) => status === "pending")) && <p>No pending requests.</p>}
          {reviews.flatMap(({ patient, requests }) => requests.filter(({ status }) => status === "pending").map(({ id }) =>
            <section key={id} aria-label={`Pending request for ${patient.pseudonym}`}>
              <p>{patient.pseudonym} · Pending</p><RamadanControls patientId={patient.id} requestId={id} />
            </section>))}
          <p className="muted small">Features remain locked until clearance. No fasting advice is provided.</p>
        </section>
      </aside>
      {selected && <div>
        <section className="card"><h2>{selected.patient.pseudonym}</h2>
          <p>{selected.patient.diagnosis} · {selected.patient.regimen}</p>
          <p className="badge">{state(selected)}</p>
        </section>
        {selected.alerts.map((alert) => <Evidence key={alert.id} alert={alert} />)}
        <History checkIns={selected.checkIns} demo={demo} />
        <section className="card"><h3>Intervention</h3>
          <p>{latestPlan ? <>Approved plan version {latestPlan.version} · <time dateTime={latestPlan.approvedAt}>{latestPlan.approvedAt}</time></> : "No plan approved yet."}</p>
          <PlanControls key={selected.patient.id} patientId={selected.patient.id} />
          <h3>Export summary</h3>
          <div className="row">
            <a className="button" href={`/api/export/${selected.patient.id}?format=csv`}>Download CSV</a>
            <a className="button" href={`/api/export/${selected.patient.id}?format=html`}>Printable HTML</a>
          </div>
        </section>
      </div>}
    </div>
    <footer className="muted">Synthetic data only · Not medical advice</footer>
  </main>;
}
