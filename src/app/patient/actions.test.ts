import { describe, expect, it } from "vitest";
import { evaluateCheckIn } from "@/engine";
import { saveActionAction, saveCheckInAction } from "./actions";

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
});
