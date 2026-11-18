import { describe, expect, it } from "vitest";
import { parseOfflineCheckInDraft } from "./offline-draft";

describe("offline check-in draft validation", () => {
  it("accepts a valid synthetic check-in draft", () => {
    expect(parseOfflineCheckInDraft({
      day: 9,
      symptoms: ["nausea"],
      appetite: 2,
      intakePercent: 50,
      weightKg: 68,
      redFlags: [],
    })).toEqual({
      day: 9,
      symptoms: ["nausea"],
      appetite: 2,
      intakePercent: 50,
      weightKg: 68,
      redFlags: [],
    });
  });

  it.each([
    { day: 15, symptoms: [], appetite: 3, intakePercent: 50 },
    { day: 9, symptoms: ["unknown"], appetite: 3, intakePercent: 50 },
    { day: 9, symptoms: [], appetite: 6, intakePercent: 50 },
    { day: 9, symptoms: [], appetite: 3, intakePercent: 101 },
    { day: 9, symptoms: [], appetite: 3, intakePercent: 50, redFlags: ["unknown"] },
  ])("rejects malformed or out-of-range drafts", (draft) => {
    expect(parseOfflineCheckInDraft(draft)).toBeNull();
  });
});
