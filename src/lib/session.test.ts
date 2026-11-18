import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoEnabled } from "./session";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_DEMO", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
});

describe("demo mode configuration", () => {
  it("enables demo mode when Supabase settings are both absent", () => {
    expect(demoEnabled()).toBe(true);
  });

  it("does not enable the clinician and caregiver demos when configured for Supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
    expect(demoEnabled()).toBe(false);
  });

  it("can explicitly enable demo mode alongside Supabase configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://synthetic.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-key");
    vi.stubEnv("NEXT_PUBLIC_DEMO", "true");
    expect(demoEnabled()).toBe(true);
  });
});
