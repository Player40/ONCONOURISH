import {
  GUARDRAILS,
  IN_SCOPE_GUARDRAIL,
  type GuardrailId,
} from "@/data/guardrails";
import type { Locale } from "@/engine/types";

export interface GuardrailResult {
  readonly id: GuardrailId | "IN-SCOPE";
  readonly category: string;
  readonly route: string;
  readonly message: string;
}

export function checkGuardrailText(input: string, locale: Locale = "en"): GuardrailResult {
  for (const guardrail of GUARDRAILS) {
    if (guardrail.patterns.some((pattern) => pattern.test(input))) {
      return {
        id: guardrail.id,
        category: guardrail.category,
        route: guardrail.route,
        message: guardrail.message[locale],
      };
    }
  }
  return {
    id: "IN-SCOPE",
    category: "Eating and drinking support",
    route: "Food engine (symptom filters apply)",
    message: IN_SCOPE_GUARDRAIL[locale],
  };
}
