import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ACCESS_COOKIE, DEMO_COOKIE } from "@/lib/session";
import CaregiverPage from "./page";

const { jar } = vi.hoisted(() => ({ jar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
}));

const caregiverId = "10000000-0000-4000-8000-000000000005";
const patientId = "20000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  jar.clear();
});

it("shows only the linked caregiver's RLS-filtered check-ins, without patient profile details", async () => {
  vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
  jar.set(ACCESS_COOKIE, { value: "verified-token" });
  const paths: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
    const url = new URL(input);
    paths.push(url.pathname);
    if (url.pathname === "/auth/v1/user") return Response.json({ id: caregiverId });
    if (url.pathname === "/rest/v1/profiles") return Response.json([{ role: "caregiver" }]);
    if (url.pathname === "/rest/v1/caregiver_links") {
      expect(url.searchParams.get("caregiver_user_id")).toBe(`eq.${caregiverId}`);
      return Response.json([{ patient_id: patientId }]);
    }
    if (url.pathname === "/rest/v1/checkins") return Response.json([{
      day: 4, symptoms: ["nausea"], red_flags: [], appetite: 2, intake_pct: 25, weight_kg: null,
    }]);
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));

  const html = renderToStaticMarkup(await CaregiverPage());
  expect(html).toContain("Shared record 1");
  expect(html).toContain("nausea");
  expect(html).toContain("25");
  expect(html).not.toContain(patientId);
  expect(paths).not.toContain("/rest/v1/patients");
});

it("requires a caregiver role and sends unauthenticated visitors to sign in", async () => {
  vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
  jar.set(ACCESS_COOKIE, { value: "verified-token" });
  vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
    const url = new URL(input);
    if (url.pathname === "/auth/v1/user") return Response.json({ id: caregiverId });
    if (url.pathname === "/rest/v1/profiles") return Response.json([{ role: "patient" }]);
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));
  expect(renderToStaticMarkup(await CaregiverPage())).toContain("Caregiver access required");
  jar.clear();
  await expect(CaregiverPage()).rejects.toThrow("REDIRECT /login");
});

it("keeps the demo caregiver view gated by the synthetic consent toggle", async () => {
  vi.stubEnv("NEXT_PUBLIC_DEMO", "true");
  jar.set(DEMO_COOKIE, { value: "synthetic-caregiver" });
  const demo = await import("@/lib/demo-repository");
  await demo.demoRepository.setConsent(demo.DEMO_PATIENT_IDS.layla, "caregiver_access", false);
  expect(renderToStaticMarkup(await CaregiverPage())).toContain("No check-ins are currently shared");
  await demo.demoRepository.setConsent(demo.DEMO_PATIENT_IDS.layla, "caregiver_access", true);
  expect(renderToStaticMarkup(await CaregiverPage())).toContain("Shared record 1");
});
