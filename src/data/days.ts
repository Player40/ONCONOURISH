import type { DemoDay } from "@/engine/types";

export const DEMO_DAYS = [
  { day: 1, logged: true, symptoms: [], appetite: 4, intakePercent: 85, weightKg: 68, actionsOffered: ["liquid", "small"], actionsCompleted: ["liquid", "small"] },
  { day: 2, logged: true, symptoms: ["steroid_hunger"], appetite: 5, intakePercent: 100, weightKg: 68.1, actionsOffered: ["small", "fluids"], actionsCompleted: ["small", "fluids"] },
  { day: 3, logged: true, symptoms: ["nausea"], appetite: 3, intakePercent: 70, weightKg: 67.8, actionsOffered: ["liquid", "cold"], actionsCompleted: ["liquid", "cold"] },
  { day: 4, logged: true, symptoms: ["nausea_severe", "metallic"], appetite: 2, intakePercent: 50, weightKg: 67.5, actionsOffered: ["liquid", "cold", "small"], actionsCompleted: ["liquid", "cold"] },
  { day: 5, logged: true, symptoms: ["nausea", "metallic"], appetite: 2, intakePercent: 45, weightKg: 67.3, actionsOffered: ["liquid", "cold", "hot"], actionsCompleted: ["cold"] },
  { day: 6, logged: false },
  { day: 7, logged: false },
  { day: 8, logged: false },
  { day: 9, logged: true, symptoms: ["metallic", "mouth_sores"], appetite: 1, intakePercent: 35, weightKg: 66.4, actionsOffered: ["liquid", "cold"], actionsCompleted: [] },
  { day: 10, logged: true, symptoms: ["mouth_sores", "low_immunity"], appetite: 2, intakePercent: 45, weightKg: 66.3, actionsOffered: ["liquid", "cold"], actionsCompleted: [] },
  { day: 11, logged: true, symptoms: ["mouth_sores", "low_immunity", "fatigue"], appetite: 2, intakePercent: 50, weightKg: 66.2, actionsOffered: ["liquid", "cold"], actionsCompleted: [] },
  { day: 12, logged: true, symptoms: ["low_immunity", "fatigue"], appetite: 3, intakePercent: 60, weightKg: 66.3, actionsOffered: ["liquid", "small"], actionsCompleted: [] },
  { day: 13, logged: true, symptoms: ["fatigue"], appetite: 3, intakePercent: 65, weightKg: 66.4, actionsOffered: ["liquid", "small"], actionsCompleted: [] },
  { day: 14, logged: true, symptoms: [], appetite: 4, intakePercent: 75, weightKg: 66.6, actionsOffered: ["liquid", "small"], actionsCompleted: [] },
] as const satisfies readonly DemoDay[];
