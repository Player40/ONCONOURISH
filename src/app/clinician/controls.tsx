"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ACTION_IDS } from "@/engine/types";
import type { Alert } from "@/lib/repository";

const labels = {
  liquid: "Add a fortified drink", small: "Offer smaller snacks", fluids: "Sip fluids regularly",
  cold: "Offer cold options", hot: "Offer warm options",
};

function useWorkflow(path: string) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(body: object, success: string) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!response.ok) {
        setMessage((await response.json()).error ?? "Unable to save. Try again.");
        return;
      }
      setMessage(success);
      router.refresh();
    } catch {
      setMessage("Unable to save. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return { send, busy, message };
}

export function PlanControls({ patientId }: { patientId: string }) {
  const { send, busy, message } = useWorkflow("/api/plan/approve");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void send({ patientId, items: data.getAll("items"), note: data.get("note") }, "New plan version approved.");
  }
  return <form className="clinician-form" onSubmit={submit}>
    <fieldset disabled={busy}>
      <legend>Plan adjustments</legend>
      {ACTION_IDS.map((id) => <label className="clinician-check" key={id}><input type="checkbox" name="items" value={id} />{labels[id]}</label>)}
      <p className="small muted">Leave all items unchecked to record review with no new actions.</p>
      <label>Intervention note (synthetic only)<textarea name="note" rows={3} maxLength={500} /></label>
      <button className="button primary" type="submit">Approve adjusted plan</button>
    </fieldset>
    <p role="status">{message}</p>
  </form>;
}

export function RamadanControls({ patientId, requestId }: { patientId: string; requestId: string }) {
  const { send, busy, message } = useWorkflow("/api/ramadan");
  return <>
    <div className="row">
      <button className="button" type="button" disabled={busy} onClick={() => void send({ patientId, requestId, action: "clear" }, "Request cleared.")}>Clear</button>
      <button className="button" type="button" disabled={busy} onClick={() => void send({ patientId, requestId, action: "decline" }, "Request declined.")}>Decline</button>
    </div>
    <span role="status">{message}</span>
  </>;
}

export function AlertReviewControl({ alert }: { alert: Alert }) {
  const { send, busy, message } = useWorkflow("/api/alerts/review");
  return <>
    {alert.state === "open"
      ? <button className="button small" type="button" disabled={busy}
          onClick={() => void send({ patientId: alert.patientId, alertId: alert.id }, "Alert marked reviewed.")}>
          Mark reviewed
        </button>
      : <p className="small muted">Reviewed{alert.reviewedAt ? ` · ${alert.reviewedAt}` : ""}</p>}
    <span role="status">{message}</span>
  </>;
}
