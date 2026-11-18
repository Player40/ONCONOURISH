import { RED_FLAG_MESSAGE } from "@/data/rules";
import type { CyclePhase } from "@/engine/phases";
import { getPhaseForCycleDay } from "@/engine/phases";
import { recommendFoods, type RecommendationResult } from "@/engine/recommendations";
import type { CheckIn, Locale } from "@/engine/types";

export type CheckInEvaluation =
  | {
      readonly urgent: true;
      readonly message: string;
      readonly phase: CyclePhase;
      readonly recommendations: null;
    }
  | {
      readonly urgent: false;
      readonly message: null;
      readonly phase: CyclePhase;
      readonly recommendations: RecommendationResult;
    };

export function evaluateCheckIn(checkIn: CheckIn, locale: Locale = "en"): CheckInEvaluation {
  const phase = getPhaseForCycleDay(checkIn.day);
  if (checkIn.redFlags && checkIn.redFlags.length > 0) {
    return {
      urgent: true,
      message: RED_FLAG_MESSAGE[locale],
      phase,
      recommendations: null,
    };
  }
  return {
    urgent: false,
    message: null,
    phase,
    recommendations: recommendFoods(checkIn, phase),
  };
}
