"use client";

import { useState, type FormEvent } from "react";
import { checkGuardrailText, type GuardrailResult } from "@/engine";
import type { Locale } from "@/engine/types";

export default function GuardrailTester() {
  const [input, setInput] = useState("");
  const [locale, setLocale] = useState<Locale>("en");
  const [result, setResult] = useState<GuardrailResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;
    setResult(checkGuardrailText(input, locale));
  }

  return <section className="card">
    <h2>Guardrail tester</h2>
    <p className="muted small">Text is checked in this browser and is not sent or saved.</p>
    <form className="question-form" onSubmit={submit}>
      <label htmlFor="guardrail-locale">Response language</label>
      <select id="guardrail-locale" value={locale} onChange={(event) => {
        const selected = event.currentTarget.value;
        if (selected === "en" || selected === "ar") setLocale(selected);
      }}>
        <option value="en">English</option>
        <option value="ar">العربية</option>
      </select>
      <label htmlFor="guardrail-input">Test text</label>
      <textarea id="guardrail-input" maxLength={2000} required rows={3} value={input} onChange={(event) => setInput(event.currentTarget.value)} />
      <button className="button primary" type="submit">Check locally</button>
    </form>
    {result && <div className={`banner ${result.id === "G-URG" ? "critical" : result.id === "IN-SCOPE" ? "success" : "warning"}`} role={result.id === "G-URG" ? "alert" : "status"}>
      <strong>{result.id} · {result.category}</strong>
      <p>{result.message}</p>
      <p className="small muted">Route: {result.route}</p>
    </div>}
  </section>;
}
