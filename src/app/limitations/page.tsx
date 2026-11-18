import Link from "next/link";

export const metadata = { title: "Limitations | OncoNourish", robots: "noindex, nofollow" };

export default function LimitationsPage() {
  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/login">OncoNourish</Link>
      <Link className="button small" href="/about">About</Link>
    </header>
    <h1>Limitations</h1>
    <p className="muted">This is a synthetic prototype, not a clinically validated system. Do not use it to make care decisions or enter real patient information.</p>
    <section className="card">
      <h2>Clinical and measurement limits</h2>
      <ul>
        <li>Food values, phase timing, symptom filters, behavior labels, and alert thresholds are illustrative placeholders pending dietitian or behavioral-science review.</li>
        <li>The 14-day cycle and day-9 default do not calculate a real treatment schedule.</li>
        <li>Intake is self-reported against usual eating; it is not measured nutrition.</li>
        <li>The synthetic cohort is generated data, not evidence of clinical outcomes, equity, or effectiveness.</li>
        <li>The food library and fixed guardrail patterns cannot assess all risks or recognize every unsafe question.</li>
      </ul>
    </section>
    <section className="card">
      <h2>Technical and language limits</h2>
      <ul>
        <li>Demo state is process-local and may reset. Supabase behavior depends on provisioned roles, configuration, RLS, and migrations.</li>
        <li>The proposed caregiver policy migration has not been applied to the linked hosted project.</li>
        <li>Device-local drafts do not sync and may remain in browser storage until saved or canceled.</li>
        <li>Arabic is machine-drafted and requires native-speaker and clinical review. Additional languages are not implemented.</li>
        <li>WhatsApp sending, FHIR/health-exchange, wearables, lab upload, barcode scanning, and an LLM layer are not implemented.</li>
        <li>Accessibility has not been independently audited; no production deployment has been verified.</li>
      </ul>
    </section>
    <p>The repository includes the full limitations document in <code>docs/LIMITATIONS.md</code>. See the <Link href="/safety">safety page</Link> for current rules and evaluation results.</p>
    <footer className="muted">Synthetic data only · Not medical advice</footer>
  </main>;
}
