import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE } from "@/lib/session";
import { evaluateCheckIn } from "@/engine";
import { saveActionAction, saveCheckInAction } from "./actions";

const { jar } = vi.hoisted(() => ({ jar: new Map<string, { value: string }>() }));
vi.mock("next/headers", () => ({ cookies: async () => jar }));

const userId = "10000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  jar.clear();
  vi.stubEnv("NEXT_PUBLIC_DEMO", "true");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  jar.clear();
});

describe("patient demo server actions", () => {
  it("persists a check-in and action completion through the demo repository", async () => {
    const snapshot = await saveCheckInAction({
      day: 6,
      symptoms: [],
      appetite: 3,
      intakePercent: 50,
      redFlags: [],
    });

    expect(snapshot.days[5].checkIn?.intakePercent).toBe(50);
    expect(snapshot.days[5].missedDays).toBe(0);
    expect(snapshot.days[5].actionsOffered).toEqual(["liquid", "small", "fluids"]);

    const updated = await saveActionAction(6, "liquid", true);
    expect(updated.days[5].actionsCompleted).toContain("liquid");
  });

  it("rejects non-choice intake for a new check-in and keeps urgent cases advice-free", async () => {
    await expect(saveCheckInAction({
      day: 7,
      symptoms: [],
      appetite: 3,
      intakePercent: 33,
      redFlags: [],
    })).rejects.toThrow("25, 50, 75, or 100");

    const snapshot = await saveCheckInAction({
      day: 7,
      symptoms: [],
      appetite: 2,
      intakePercent: 25,
      redFlags: ["red_fever"],
    });
    const checkIn = snapshot.days[6].checkIn;

    expect(checkIn).toBeDefined();
    expect(snapshot.days[6].actionsOffered).toEqual([]);
    if (!checkIn) throw new Error("The urgent check-in was not persisted.");
    expect(evaluateCheckIn(checkIn).recommendations).toBeNull();
  });

  it("writes an authenticated patient's check-in through the Supabase repository", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-key");
    jar.set(ACCESS_COOKIE, { value: "verified-token" });
    const records: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: URL | string, init?: RequestInit) => {
      const url = new URL(input);
      if (url.pathname === "/auth/v1/user") return Response.json({ id: userId });
      if (url.pathname === "/rest/v1/profiles") return Response.json([{ role: "patient" }]);
      if (url.pathname === "/rest/v1/patients") return Response.json([{
        id: "20000000-0000-4000-8000-000000000001",
        pseudonym: "Synthetic patient",
        dx: "Synthetic",
        regimen: "Synthetic",
        cycle_start: "2026-01-01",
        baseline_weight_kg: 68,
        targets: {},
        likes: [],
        budget: 2,
        locale: "en",
      }]);
      if (url.pathname === "/rest/v1/checkins") return Response.json(records);
      if (url.pathname.endsWith("/rpc/record_engine_checkin")) {
        expect(new Headers(init?.headers).get("authorization")).toBe("Bearer server-only-key");
        const payload = JSON.parse(String(init?.body));
        records.push({ patient_id: payload.target, ...payload.entry });
        return Response.json(payload.signals.map((signal: Record<string, unknown>) => ({
          ...signal, id: "alert-1", patient_id: payload.target, state: "open", created_at: "2026-11-18",
        })));
      }
      if (url.pathname.startsWith("/rest/v1/")) return Response.json([]);
      throw new Error(`Unexpected request: ${url.pathname}`);
    }));

    const snapshot = await saveCheckInAction({
      day: 1,
      symptoms: [],
      appetite: 3,
      intakePercent: 50,
      redFlags: [],
    });

    expect(snapshot.mode).toBe("supabase");
    expect(snapshot.patient.id).toBe("20000000-0000-4000-8000-000000000001");
    expect(snapshot.days[0].checkIn?.intakePercent).toBe(50);
  });
});
