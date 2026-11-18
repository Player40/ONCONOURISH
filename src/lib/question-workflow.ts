import { checkGuardrailText, evaluateCheckIn } from "@/engine";
import { GUARDRAILS } from "@/data/guardrails";
import { RED_FLAG_MESSAGE } from "@/data/rules";
import type { Locale, CheckIn } from "@/engine/types";

export interface QuestionResponse {
  readonly id: string;
  readonly category: string;
  readonly route: string;
  readonly message: string;
  readonly options?: readonly { readonly id: string; readonly name: string }[];
}

export function answerQuestion(text: string, locale: Locale, latest?: CheckIn): QuestionResponse {
  const guard = checkGuardrailText(text, locale);
  const mentionsUrgency = GUARDRAILS.some(({ id, patterns }) =>
    id === "G-URG" && patterns.some((pattern) => pattern.test(text)),
  );
  if (mentionsUrgency || latest?.redFlags?.length) {
    return {
      id: "G-URG",
      category: "Urgent symptoms",
      route: "Urgent care",
      message: RED_FLAG_MESSAGE[locale],
    };
  }
  if (guard.id !== "IN-SCOPE" || !latest) return guard;
  const evaluation = evaluateCheckIn(latest, locale);
  if (evaluation.urgent) return { ...guard, message: evaluation.message };
  return {
    ...guard,
    options: evaluation.recommendations.recommendations.map(({ food }) => ({
      id: food.id,
      name: food.name[locale],
    })),
  };
}
