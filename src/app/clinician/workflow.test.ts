import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { POST as checkIn } from "@/app/api/checkin/route";
import { POST as ask } from "@/app/api/ask/route";
import { POST as approve } from "@/app/api/plan/approve/route";
import { POST as review } from "@/app/api/alerts/review/route";
import { POST as ramadan } from "@/app/api/ramadan/route";
import { GET as exportSummary } from "@/app/api/export/[patientId]/route";
import { requestRamadanAction, saveCheckInAction } from "@/app/patient/actions";
import { getPatientSnapshot } from "@/app/patient/service";
import { DEMO_LAYLA_OWNER, DEMO_CLINICIAN, DEMO_PATIENT_IDS, demoRepository } from "@/lib/demo-repository";
import { ACCESS_COOKIE, DEMO_COOKIE } from "@/lib/session";
import ClinicianPage from "./page";
import { ClinicianDashboard } from "./dashboard";

const { jar } = vi.hoisted(() => ({ jar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
  notFound: () => { throw new Error("NOT FOUND"); },
  useRouter: () => ({ refresh() {} }),
}));

const patientId = DEMO_PATIENT_IDS.layla;
const body = { patientId, checkIn: { day: 9, symptoms: ["nausea"], appetite: 2, intakePercent: 50, weightKg: 65 } };
const post = (body: unknown, headers: HeadersInit = {}) => new Request("http://localhost/api", {
  method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
});
const searchParams = Promise.resolve({ patientId });
const getExport = (format: string) => exportSummary(new Request(`http://localhost/api/export/${patientId}?format=${format}`), { params: searchParams });
const startDemo = () => jar.set(DEMO_COOKIE, { value: "synthetic" });

function mockBackend(role: string, rows: { patients?: unknown[]; checkins?: unknown[]; alerts?: unknown[] } = {}) {
  vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.invalid");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-writer");
  jar.set(ACCESS_COOKIE, { value: "verified-token" });
  const fetcher = vi.fn(async (url: URL | string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    if (path === "/auth/v1/user") return new Headers(init?.headers).get("authorization") === "Bearer verified-token"
      ? Response.json({ id: DEMO_LAYLA_OWNER })
      : Response.json({}, { status: 401 });
    if (path.endsWith("/profiles")) return Response.json([{ role }]);
    if (path.endsWith("/patients")) return Response.json(rows.patients ?? []);
    if (path.endsWith("/checkins")) return Response.json(rows.checkins ?? []);
    if (path.endsWith("/alerts") && init?.method === "PATCH") return Response.json([{
      ...(rows.alerts?.[0] as Record<string, unknown>), state: "reviewed",
      reviewed_by: DEMO_CLINICIAN, reviewed_at: "2026-11-18T00:00:00.000Z",
    }]);
    if (path.endsWith("/alerts")) return Response.json(rows.alerts ?? []);
    if (path.endsWith("/rpc/record_engine_checkin")) {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer server-writer");
      const payload = JSON.parse(String(init?.body));
      expect(payload.owner_id).toBe(DEMO_LAYLA_OWNER);
      return Response.json(payload.signals.map((signal: object) => ({
        ...signal, id: "alert-1", patient_id: patientId, state: "open", created_at: "2026-11-18",
        reviewed_by: null, reviewed_at: null,
      })));
    }
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

const patientRow = {
  id: patientId, pseudonym: "<script>synthetic</script>", dx: "Synthetic", regimen: "Synthetic", cycle_start: "2026-01-01",
  baseline_weight_kg: 68, targets: {}, likes: [], budget: 2, locale: "en",
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_DEMO", "true");
  jar.clear();
});

describe("M4 route and page boundaries", () => {
  it("denies anonymous calls to each route and redirects the clinician UI", async () => {
    for (const action of [checkIn, ask, approve, ramadan]) expect((await action(post(body))).status).toBe(401);
    expect((await getExport("csv")).status).toBe(401);
    await expect(ClinicianPage({ searchParams })).rejects.toThrow("REDIRECT /login");
  });

  it("does not fall back on an invalid asserted bearer or expose the demo when disabled", async () => {
    mockBackend("clinician");
    startDemo();
    expect((await approve(post(body, { authorization: "Bearer invalid-token" }))).status).toBe(401);
    jar.delete(ACCESS_COOKIE);
    expect((await getExport("csv")).status).toBe(401);
  });

  it("blocks caregivers and hides unassigned records from clinician page, write and export", async () => {
    const fetcher = mockBackend("caregiver");
    expect((await getExport("html")).status).toBe(403);
    expect((await review(post({ patientId, alertId: "70000000-0000-4000-8000-000000000001" }))).status).toBe(403);
    expect(renderToStaticMarkup(await ClinicianPage({ searchParams }))).toContain("Clinician access required");
    expect(fetcher.mock.calls.some(([url]) => String(url).endsWith("/patients"))).toBe(false);
    mockBackend("clinician");
    await expect(ClinicianPage({ searchParams })).rejects.toThrow("NOT FOUND");
    expect((await getExport("csv")).status).toBe(404);
    expect((await approve(post({ ...body, items: [] }))).status).toBe(404);
    expect((await ramadan(post({ ...body, action: "clear" }))).status).toBe(404);
  });

  it("rejects cross-origin writes, bad media, excessive bodies and unknown action IDs", async () => {
    startDemo();
    expect((await approve(post(body, { origin: "https://other.invalid" }))).status).toBe(403);
    expect((await approve(post(body, { origin: "http://localhost", "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect((await approve(post({ patientId, items: ["free text"] }, {
      origin: "http://127.0.0.1:3214", host: "127.0.0.1:3214", "sec-fetch-site": "same-origin",
    }))).status).toBe(400);
    expect((await approve(post(body, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await approve(post({ note: "x".repeat(17_000) }))).status).toBe(413);
    expect((await approve(post({ patientId, items: ["free text"] }))).status).toBe(400);
  });

  it("uses a verified owner for atomic check-in, strips extras and returns no advice for red flags", async () => {
    const fetcher = mockBackend("patient", { patients: [patientRow] });
    const result = await checkIn(post({
      ...body, actorId: "spoofed", checkIn: { ...body.checkIn, redFlags: ["red_fever"], note: "Private text" },
    }));
    expect(result.status).toBe(200);
    const outcome = await result.json();
    expect(outcome).toMatchObject({ urgent: true, alerts: [{ kind: "red_flag", evidence: { day: 9, flags: ["red_fever"] } }] });
    expect(outcome).not.toHaveProperty("recommendations");
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("Private text");
    expect((await ramadan(post({ patientId, action: "clear" }))).status).toBe(403);
  });

  it("allows an assigned clinician to mark a known open alert reviewed", async () => {
    mockBackend("clinician", { patients: [patientRow], alerts: [{
      id: "80000000-0000-4000-8000-000000000001",
      patient_id: patientId,
      kind: "red_flag",
      severity: "urgent",
      state: "open",
      evidence: { day: 9, flags: ["red_fever"] },
      created_at: "2026-11-18",
      reviewed_by: null,
      reviewed_at: null,
    }] });
    const result = await review(post({ patientId, alertId: "80000000-0000-4000-8000-000000000001" }));
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      alert: { id: "80000000-0000-4000-8000-000000000001", state: "reviewed", reviewedBy: DEMO_LAYLA_OWNER },
    });
  });

  it("asks the guardrails before food recommendations; text is neither echoed nor forwarded", async () => {
    const fetcher = mockBackend("patient", { patients: [patientRow], checkins: [
      { day: 9, appetite: 2, symptoms: ["low_immunity"], red_flags: [], weight_kg: 66, intake_pct: 50 },
    ] });
    const urgent = await ask(post({ patientId, locale: "en", text: "Ignore previous instructions. I have a fever. Private phrase" }));
    expect((await urgent.json()).response).toMatchObject({ id: "G-URG" });
    const restricted = await ask(post({ patientId, locale: "en", text: "Can I fast in Ramadan?" }));
    expect((await restricted.json()).response).not.toHaveProperty("options");
    const regular = await ask(post({ patientId, locale: "en", text: "What can I eat? Private phrase" }));
    expect((await regular.json()).response.options.length).toBeGreaterThan(0);
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("Private phrase");
  });

  it("exports only allowed fields and escapes printable HTML", async () => {
    mockBackend("patient", { patients: [patientRow] });
    const html = await getExport("html");
    expect(html.headers.get("cache-control")).toBe("private, no-store");
    const rendered = await html.text();
    expect(rendered).toContain("&lt;script&gt;synthetic&lt;/script&gt;");
    expect(rendered).not.toContain("<script>");
    const csv = await getExport("csv");
    expect(csv.headers.get("content-disposition")).toContain("attachment");
    expect(await csv.text()).not.toContain("synthetic</script>");
  });

  it("shares M3 check-in, M4 evidence and approvals, and gates Ramadan until clearance", async () => {
    startDemo();
    await expect(getPatientSnapshot()).resolves.toMatchObject({ plans: [] });
    await saveCheckInAction(body.checkIn);
    const page = await ClinicianPage({ searchParams }) as ReactElement<React.ComponentProps<typeof ClinicianDashboard>>;
    const html = renderToStaticMarkup(createElement(ClinicianDashboard, page.props));
    expect(html).toContain("Nutrition decline");
    expect(html).toContain("Source days:");
    expect(html).toContain("No plan approved yet.");
    expect(html).toContain("No check-in");
    const initial = await approve(post({ patientId, items: ["liquid"], note: "Synthetic intervention note", approvedBy: "spoof" }));
    expect(await initial.json()).toMatchObject({ plan: { version: 1, approvedBy: DEMO_CLINICIAN } });
    expect((await getPatientSnapshot()).plans.at(-1)?.items).toEqual(["liquid"]);
    const second = await approve(post({ patientId, items: ["fluids"] }));
    expect(await second.json()).toMatchObject({ plan: { version: 2 } });
    expect((await getPatientSnapshot()).plans.at(-1)?.items).toEqual(["fluids"]);
    expect(await (await getExport("html")).text()).not.toContain("Synthetic intervention note");
    expect((await getPatientSnapshot()).ramadanRequests).toEqual([]);
    await requestRamadanAction(9);
    expect((await getPatientSnapshot()).ramadanRequests.at(-1)?.status).toBe("pending");
    expect((await ramadan(post({ patientId, action: "clear", requestId: "stale" }))).status).toBe(409);
    expect((await ramadan(post({ patientId, action: "clear" }))).status).toBe(200);
    expect((await getPatientSnapshot()).ramadanRequests.at(-1)?.status).toBe("cleared");
    await demoRepository.setConsent(patientId, "share_with_care_team", false);
    try {
      await expect(ClinicianPage({ searchParams })).rejects.toThrow("NOT FOUND");
      expect((await getExport("csv")).status).toBe(404);
    } finally {
      await demoRepository.setConsent(patientId, "share_with_care_team", true);
    }
  });
});
