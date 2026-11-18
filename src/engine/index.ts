export { evaluateNutritionAlert } from "@/engine/alerts";
export type { AlertCondition, NutritionAlertResult } from "@/engine/alerts";
export { evaluateCheckIn } from "@/engine/evaluate";
export type { CheckInEvaluation } from "@/engine/evaluate";
export { checkGuardrailText } from "@/engine/guardrails";
export type { GuardrailResult } from "@/engine/guardrails";
export { getLapseResponse } from "@/engine/lapse";
export type { LapseResponse } from "@/engine/lapse";
export { buildDailyPlan, getActionText } from "@/engine/plans";
export type { DailyAction, DailyPlanInput } from "@/engine/plans";
export { getPhaseForCycleDay } from "@/engine/phases";
export type { CyclePhase } from "@/engine/phases";
export { getProgressBank, getWorkedActionStats } from "@/engine/progress";
export type { WorkedActionStat } from "@/engine/progress";
export { recommendFoods } from "@/engine/recommendations";
export type {
  FoodExclusion,
  FoodRecommendation,
  RecommendationResult,
} from "@/engine/recommendations";
