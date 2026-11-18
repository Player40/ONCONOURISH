import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE, DEMO_COOKIE } from "@/lib/session";
import { enterPatientDemo, signIn } from "./actions";

const { jar } = vi.hoisted(() => ({ jar: new Map<string, { value: string }>() }));

vi.mock("next/headers", () => ({ cookies: async () => jar }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
}));

const userId = "10000000-0000-4000-8000-000000000001";

function credentials() {
  const form = new FormData();
  form.set("email", "synthetic@example.invalid");
  form.set("password", "synthetic-password");
  return form;
}

function mockAuth(role: string | null) {
  vi.stubGlobal("fetch", vi.fn(async (input: URL | string) => {
    const url = new URL(input);
    if (url.pathname === "/auth/v1/token") {
      return Response.json({ access_token: "verified-token", expires_in: 3600, user: { id: userId } });
    }
    if (url.pathname === "/rest/v1/profiles") {
      return Response.json(role ? [{ role }] : []);
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  }));
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
  jar.clear();
  jar.set(DEMO_COOKIE, { value: "synthetic" });
});

describe("role-aware sign in", () => {
  it("clears a stale Supabase session before entering the patient demo", async () => {
    jar.set(ACCESS_COOKIE, { value: "expired-token" });
    await expect(enterPatientDemo()).rejects.toThrow("REDIRECT /patient");
    expect(jar.has(ACCESS_COOKIE)).toBe(false);
    expect(jar.has(DEMO_COOKIE)).toBe(false);
  });

  it("routes by the provisioned database role and clears demo mode", async () => {
    mockAuth("patient");
    await expect(signIn(credentials())).rejects.toThrow("REDIRECT /patient");
    expect(jar.get(ACCESS_COOKIE)).toBe("verified-token");
    expect(jar.has(DEMO_COOKIE)).toBe(false);
  });

  it("does not create an app session when Auth succeeds without a profile role", async () => {
    mockAuth(null);
    await expect(signIn(credentials())).rejects.toThrow("REDIRECT /login?error=profile");
    expect(jar.has(ACCESS_COOKIE)).toBe(false);
    expect(jar.has(DEMO_COOKIE)).toBe(false);
  });
});
