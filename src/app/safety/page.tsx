import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { GUARDRAILS, ARABIC_GUARDRAIL_REVIEW_NOTE } from "@/data/guardrails";
import { FOOD_RULES, ALERT_THRESHOLDS, ENGAGEMENT_THRESHOLDS } from "@/data/rules";
import GuardrailTester from "./guardrail-tester";

export const metadata = { title: "Safety | OncoNourish", robots: "noindex, nofollow" };

async function readEvaluationReport(): Promise<string | null> {
  const reportPath = join(process.cwd(), "docs", "EVAL_REPORT.md");
  return existsSync(reportPath) ? readFile(reportPath, "utf8") : null;
}

export default async function SafetyPage() {
  const evaluationReport = await readEvaluationReport();

  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/login">OncoNourish</Link>
      <nav className="row" aria-label="Product information">
        <Link className="button small" href="/measurement">Measurement</Link>
        <Link className="button small" href="/about">About</Link>
      </nav>
    </header>
    <h1>Safety and boundaries</h1>
    <p className="muted">Synthetic prototype only. The rules below are inspectable placeholders, not clinically validated guidance.</p>
    <GuardrailTester />
    <section className="card">
      <h2>Food and alert rules</h2>
      <div className="clinician-table">
        <table>
          <thead><tr><th scope="col">ID</th><th scope="col">Rule</th><th scope="col">Current behavior</th><th scope="col">Status</th></tr></thead>
          <tbody>{FOOD_RULES.map(({ id, label, description, status }) => <tr key={id}>
            <th scope="row">{id}</th><td>{label}</td><td>{description}</td><td>{status}</td>
          </tr>)}
          <tr><th scope="row">AL-01</th><td>Nutrition alert</td>
            <td>Requires all three placeholder conditions: mean intake below {ALERT_THRESHOLDS.meanIntakeBelowPercent}%, weight loss of at least {ALERT_THRESHOLDS.weightLossAtLeastPercent}%, and the same symptom in at least {ALERT_THRESHOLDS.sameSymptomAtLeastCheckIns} logged check-ins.</td>
            <td>Placeholder</td>
          </tr>
          <tr><th scope="row">EN-01</th><td>Engagement</td>
            <td>Plan shrinks after {ENGAGEMENT_THRESHOLDS.shrinkPlanAfterMissedDays}+ missed days; a routine flag requires {ENGAGEMENT_THRESHOLDS.routineFlagAfterMissedDays}+ missed days and prior intake below {ENGAGEMENT_THRESHOLDS.routineFlagRequiresLastIntakeBelowPercent}%.</td>
            <td>Placeholder</td>
          </tr></tbody>
        </table>
      </div>
    </section>
    <section className="card">
      <h2>Guardrail registry</h2>
      <div className="clinician-table">
        <table>
          <thead><tr><th scope="col">ID</th><th scope="col">Category</th><th scope="col">Route</th><th scope="col">English response</th></tr></thead>
          <tbody>{GUARDRAILS.map(({ id, category, route, message }) => <tr key={id}>
            <th scope="row">{id}</th><td>{category}</td><td>{route}</td><td>{message.en}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <p className="muted small">{ARABIC_GUARDRAIL_REVIEW_NOTE}</p>
    </section>
    <section className="card">
      <h2>The app will never</h2>
      <ul>
        <li>claim that food or this app treats or cures cancer;</li>
        <li>give food advice when an urgent symptom is reported;</li>
        <li>recommend changing or stopping cancer treatment;</li>
        <li>provide supplement doses or fasting advice;</li>
        <li>use an LLM for safety decisions or send it free text; or</li>
        <li>share data with employers or insurers.</li>
      </ul>
    </section>
    <section className="card">
      <h2>Latest evaluation report</h2>
      {evaluationReport
        ? <details><summary>Open the generated test results</summary><pre className="report-text">{evaluationReport}</pre></details>
        : <p>No evaluation report exists yet. Run <code>pnpm eval</code> to generate it from the test suite.</p>}
    </section>
    <footer className="muted">Synthetic data only · Thresholds and food values are placeholders · Not medical advice</footer>
  </main>;
}
