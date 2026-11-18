import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_CAREGIVER, DEMO_LAYLA_OWNER, DEMO_PATIENT_IDS, DemoRepository } from "@/lib/demo-repository";
import { evaluateNutritionAlert } from "@/engine";
import { getRepository } from "@/lib/repository-factory";
import { SupabaseRepository } from "@/lib/supabase-repository";

afterEach(() => vi.unstubAllGlobals());

describe("demo repository", () => {
  it("preserves Layla's missed days and shares changes through the same instance", async () => {
    const repository = new DemoRepository();
    const id = DEMO_PATIENT_IDS.layla;
    expect((await repository.listCheckIns(id)).map(({ day }) => day)).not.toContain(6);
    await repository.saveCheckIn(id, { day: 15, symptoms: [], appetite: 3, intakePercent: 75 });
    expect((await repository.listCheckIns(id)).at(-1)?.day).toBe(15);
    expect(await new DemoRepository().listCheckIns(id)).not.toContainEqual(expect.objectContaining({ day: 15 }));
  });

  it("copies returned data and rejects non-sequential plan versions", async () => {
    const repository = new DemoRepository();
    const id = DEMO_PATIENT_IDS.layla;
    const patients = await repository.listPatients();
    patients[0].likes.push("not-persisted");
    expect((await repository.listPatients())[0].likes).not.toContain("not-persisted");
    const plan = { patientId: id, version: 1, items: ["liquid"] as const, note: null, status: "approved" as const, approvedBy: "demo-clinician", approvedAt: "2026-01-01T00:00:00Z" };
    await repository.approvePlan({ ...plan, items: [...plan.items] });
    await expect(repository.approvePlan({ ...plan, items: [...plan.items] })).rejects.toThrow("next version");
    expect(await repository.listPlans(id)).toHaveLength(1);
  });

  it("keeps Ramadan pending until decided and refuses a second decision", async () => {
    const repository = new DemoRepository();
    await repository.createRamadanRequest(DEMO_PATIENT_IDS.layla);
    const [request] = await repository.listRamadanRequests(DEMO_PATIENT_IDS.layla);
    expect(request.status).toBe("pending");
    await repository.decideRamadanRequest(request.id, "cleared", "demo-clinician", "2026-01-01T00:00:00Z");
    await expect(repository.decideRamadanRequest(request.id, "declined", "demo-clinician", "2026-01-01T00:00:00Z")).rejects.toThrow("already decided");
  });

  it("persists demo consent and barrier choices without exposing mutable references", async () => {
    const repository = new DemoRepository();
    const id = DEMO_PATIENT_IDS.layla;
    await repository.setConsent(id, "caregiver_access", true);
    await repository.saveBarrier(id, { day: 9, barrier: "tired", responseId: "tired" });
    const barriers = await repository.listBarriers(id);
    barriers[0].responseId = "changed";
    expect(await repository.getConsents(id)).toMatchObject({ caregiver_access: true });
    expect(await repository.listBarriers(id)).toEqual([{ day: 9, barrier: "tired", responseId: "tired" }]);
  });

  it("only exposes linked demo check-ins after the patient enables caregiver consent", async () => {
    const repository = new DemoRepository();
    const patientId = DEMO_PATIENT_IDS.layla;
    expect(await repository.listCaregiverPatientIds(DEMO_CAREGIVER)).toEqual([]);
    expect(await repository.countActiveCaregiverLinks(patientId)).toBe(1);
    await repository.setConsent(patientId, "caregiver_access", true);
    expect(await repository.listCaregiverPatientIds(DEMO_CAREGIVER)).toEqual([patientId]);
    expect(await repository.listCaregiverPatientIds(DEMO_LAYLA_OWNER)).toEqual([]);
  });

  it("uses the engine to distinguish the synthetic stable and watch courses", async () => {
    const repository = new DemoRepository();
    expect(evaluateNutritionAlert(await repository.listCheckIns(DEMO_PATIENT_IDS.omar), 75).status).toBe("clear");
    expect(evaluateNutritionAlert(await repository.listCheckIns(DEMO_PATIENT_IDS.priya), 60).status).toBe("watch");
  });
});

describe("repository selection and Supabase transport", () => {
  it("shares demo state but rejects incomplete configured credentials", () => {
    expect(getRepository({}).repository).toBe(getRepository({ demo: true }).repository);
    expect(() => getRepository({ url: "https://example.invalid" })).toThrow("requires");
    expect(() => getRepository({ url: "https://example.invalid", anonKey: "key" })).toThrow("authenticated");
    expect(() => getRepository({ accessToken: "token" })).toThrow("requires");
  });

  it("sends the session token and fails rather than falling back on a denied write", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("denied", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const repository = new SupabaseRepository("https://example.invalid", "public-key", "session-token");
    await expect(repository.saveCheckIn("patient", { day: 1, symptoms: [], appetite: 3, intakePercent: 50 })).rejects.toThrow("403");
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/rest/v1/checkins");
    expect(options.headers.Authorization).toBe("Bearer session-token");
  });

  it("rejects a write that affected no rows and malformed returned values", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json([{ day: 1, symptoms: ["free text"], red_flags: [], appetite: 3, intake_pct: 50, weight_kg: null }]));
    vi.stubGlobal("fetch", fetchMock);
    const repository = new SupabaseRepository("https://example.invalid", "public-key", "session-token");
    await expect(repository.decideRamadanRequest("id", "cleared", "clinician", "2026-01-01T00:00:00Z")).rejects.toThrow("affected 0 rows");
    await expect(repository.listCheckIns("id")).rejects.toThrow("Unknown database choice");
  });
});
