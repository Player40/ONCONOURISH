import Link from "next/link";

export const metadata = { title: "About | OncoNourish", robots: "noindex, nofollow" };

export default function AboutPage() {
  return <main className="app-shell">
    <header className="topbar">
      <Link className="brand" href="/login">OncoNourish</Link>
      <nav className="row" aria-label="Product information">
        <Link className="button small" href="/measurement">Measurement</Link>
        <Link className="button small" href="/safety">Safety</Link>
      </nav>
    </header>
    <h1>About OncoNourish</h1>
    <section className="card">
      <h2>Scope</h2>
      <p>OncoNourish is a synthetic prototype for supportive eating and drinking behavior during cancer treatment. It demonstrates deterministic symptom filters, small actions, lapse recovery, patient-controlled sharing, and a clinician review loop.</p>
      <p>It does not diagnose, treat cancer, replace a dietitian, or give urgent-care, supplement-dose, or fasting advice. No clinical effectiveness has been established.</p>
    </section>
    <section className="card">
      <h2>Data and privacy</h2>
      <ul>
        <li>This repository and its demo contain synthetic records only. Do not enter real patient information.</li>
        <li>Authentication roles are assigned by an administrator; users cannot select a role for themselves.</li>
        <li>Caregiver records require an active administrator-managed link and the patient&apos;s current consent.</li>
        <li>Patient questions in the interface are checked locally and are not saved or sent to a language model.</li>
        <li>WhatsApp settings record a preference only; no messages are sent.</li>
        <li>Employers and insurers have no application roles or data access.</li>
      </ul>
    </section>
    <section className="card">
      <h2>Evidence context</h2>
      <p>The prototype uses these published sources only for context. They do not validate this software, its placeholder thresholds, or its food values.</p>
      <ol>
        <li>
          ESPEN Expert Group Recommendations (2017): malnutrition prevalence in cancer varies by setting (roughly 20% to over 70%); an estimated 10%–20% of cancer deaths are attributable to malnutrition rather than malignancy. The same source describes associations with lower chemotherapy tolerance, more infections, and higher mortality. These are population-level findings, not effects of this app.
        </li>
        <li>
          Nutritional counselling during chemotherapy: a 2024 systematic review of small early-phase trials reported feasibility and safety with preliminary benefit. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11764068/" rel="noreferrer">Review in PubMed Central</a>.
        </li>
        <li>
          Sonbol MB, et al. *The effect of a neutropenic diet on infection rates in cancer patients: a meta-analysis of randomized controlled trials*. BMJ Supportive &amp; Palliative Care. 2019;9(4):425–433. <a href="https://doi.org/10.1136/bmjspcare-2018-001742" rel="noreferrer">doi:10.1136/bmjspcare-2018-001742</a>. The review found no evidence that neutropenic diets reduce infection and advised standard safe-food handling.
        </li>
        <li>
          IARC Global Cancer Observatory, GLOBOCAN 2024, United Arab Emirates: 8,815 new cases, 3,814 deaths, and 29,704 five-year prevalent cases. <a href="https://gco.iarc.who.int/" rel="noreferrer">Global Cancer Observatory</a>.
        </li>
      </ol>
      <p className="muted small">Not claimed: that this app prevents treatment interruptions, improves survival, or that any diet treats cancer.</p>
    </section>
    <section className="card">
      <h2>Current limits</h2>
      <p>Thresholds, nutrient values, the treatment-phase schedule, and generated cohort metrics are illustrative placeholders. Arabic content is machine-drafted and requires native-speaker and clinical review. See <Link href="/safety">Safety</Link> and <Link href="/limitations">the limitations summary</Link>.</p>
    </section>
    <footer className="muted">Synthetic data only · Supportive care only · Not medical advice</footer>
  </main>;
}
