import { BARRIERS } from "@/data/barriers";
import type { BarrierId, Locale } from "@/engine/types";

export interface DailyAction {
  readonly id: "liquid" | "small" | "fluids";
  readonly text: { readonly en: string; readonly ar: string };
}

const DEFAULT_ACTIONS: readonly DailyAction[] = [
  {
    id: "liquid",
    text: { en: "One fortified drink (about 200 ml) by 10:00", ar: "مشروب مدعّم واحد (حوالي ٢٠٠ مل) قبل العاشرة" },
  },
  {
    id: "small",
    text: { en: "A small snack every 2 to 3 hours", ar: "وجبة خفيفة صغيرة كل ٢ إلى ٣ ساعات" },
  },
  {
    id: "fluids",
    text: { en: "Sip 100 ml of fluids each hour you are awake", ar: "رشفات ١٠٠ مل من السوائل كل ساعة" },
  },
];

export interface DailyPlanInput {
  readonly missedDays: number;
  readonly selectedBarrier?: BarrierId;
}

export function buildDailyPlan({ missedDays, selectedBarrier }: DailyPlanInput): {
  readonly actions: readonly DailyAction[];
  readonly shrunk: boolean;
  readonly barrierResponse?: (typeof BARRIERS)[BarrierId];
  readonly technique?: string;
  readonly limit: string;
} {
  if (!Number.isInteger(missedDays) || missedDays < 0) {
    throw new RangeError("Missed days must be a non-negative integer.");
  }

  const shrunk = missedDays >= 2 || selectedBarrier !== undefined;
  return {
    actions: shrunk ? [DEFAULT_ACTIONS[0]] : DEFAULT_ACTIONS,
    shrunk,
    ...(selectedBarrier ? { barrierResponse: BARRIERS[selectedBarrier], technique: "Graded tasks" } : {}),
    limit: "This illustrative plan does not replace goals set by a dietitian.",
  };
}

export function getActionText(action: DailyAction, locale: Locale): string {
  return action.text[locale];
}
