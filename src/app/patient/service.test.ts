import { describe, expect, it } from "vitest";
import { getLapseResponse } from "@/engine";
import { DemoRepository, DEMO_PATIENT_IDS } from "@/lib/demo-repository";
import { buildPatientSnapshot } from "./service";

describe("patient demo snapshot", () => {
  it("preserves the three-day return gap and the last intake before it", async () => {
    const snapshot = await buildPatientSnapshot(new DemoRepository(), 9);
    const dayNine = snapshot.days[8];

    expect(dayNine.missedDays).toBe(3);
    expect(dayNine.lastIntakeBeforeGap).toBe(45);
    expect(getLapseResponse(dayNine.missedDays, dayNine.lastIntakeBeforeGap, {
      whatsappReminders: false,
      caregiverContact: false,
    })).toMatchObject({
      welcomeBackWithoutCatchUp: true,
      shrinkGoal: true,
      raiseRoutineFlag: true,
      offerWhatsAppReminder: false,
      mayContactCaregiver: false,
    });
  });

  it("records a check-in on a missed day without resetting later progress", async () => {
    const repository = new DemoRepository();
    const before = await buildPatientSnapshot(repository, 9);
    await repository.saveCheckIn(DEMO_PATIENT_IDS.layla, {
      day: 6,
      symptoms: [],
      appetite: 3,
      intakePercent: 50,
    });
    const after = await buildPatientSnapshot(repository, 9);

    expect(before.days.filter(({ checkIn }) => checkIn).length).toBe(11);
    expect(after.days[5].actionsOffered).toEqual(["liquid", "small", "fluids"]);
    expect(after.days[8].missedDays).toBe(2);
    expect(after.days.filter(({ checkIn }) => checkIn).length).toBe(12);
  });
});
