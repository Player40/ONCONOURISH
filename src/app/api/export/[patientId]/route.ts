import { authorizePatient, WorkflowError } from "@/lib/clinical-workflow";
import { PRIVATE_HEADERS, errorResponse, requireSession } from "@/lib/workflow-http";

const escape = (value: string) => value.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const headings = ["Cycle day", "Intake (%)", "Weight (kg)", "Appetite", "Symptoms", "Urgent flags"];

export async function GET(request: Request, { params }: { params: Promise<{ patientId: string }> }) {
  try {
    const session = await requireSession(request);
    const patient = await authorizePatient(session, (await params).patientId, ["patient", "clinician"]);
    const format = new URL(request.url).searchParams.get("format") ?? "csv";
    if (format !== "csv" && format !== "html") throw new WorkflowError(400, "Format must be csv or html.");
    const rows = (await session.repository.listCheckIns(patient.id)).map((item) => [
      item.day, item.intakePercent, item.weightKg ?? "", item.appetite, item.symptoms.join("; "), item.redFlags?.join("; ") ?? "",
    ].map(String));
    if (format === "csv") {
      // Only numeric fields and enumerated IDs; no pseudonyms, questions or notes in spreadsheet cells.
      const csv = [headings, ...rows].map((cells) => cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
      return new Response(`${csv}\r\n`, { headers: {
        ...PRIVATE_HEADERS, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="check-in-summary.csv"',
      } });
    }
    const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>Check-in summary</title>
      <style>body{font:16px system-ui;margin:2em}table{border-collapse:collapse}th,td{border:1px solid;padding:.4em;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}</style>
      <h1>Check-in summary: ${escape(patient.pseudonym)}</h1>
      <p>Synthetic data only · Not medical advice. Printable using your browser’s Print command.</p>
      <p>Intake is a self-reported proxy.</p>
      <table><thead><tr>${headings.map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((cells) => `<tr>${cells.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></html>`;
    return new Response(html, { headers: {
      ...PRIVATE_HEADERS, "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
    } });
  } catch (error) {
    return errorResponse(error);
  }
}
