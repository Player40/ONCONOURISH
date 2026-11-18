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

function guardrailCandidates(input: string): readonly string[] {
  const normalized = input.normalize("NFKC")
    .replace(/[\u0640\u200b-\u200f\ufeff\p{Mn}]/gu, "")
    .toLowerCase();
  const deObfuscated = normalized
    .replace(/[013457]/g, (character) => ({
      "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
    })[character] ?? character)
    .replace(/\b(?:[a-z]\s+){1,}[a-z]\b/gi, (word) => word.replace(/\s+/g, ""));
  return [input, normalized, deObfuscated];
}

export function checkGuardrailText(input: string, locale: Locale = "en"): GuardrailResult {
  const candidates = guardrailCandidates(input);
  for (const guardrail of GUARDRAILS) {
    if (guardrail.patterns.some((pattern) => candidates.some((candidate) => pattern.test(candidate)))) {
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
