import { type TriageModel, triageChoices } from "../../src/domain/mail-triage.js";
export function triageResponse(model: TriageModel = "jev-1.13.0") {
  const answer = <T extends Record<string, string>>(criteria: T, choice: keyof T & string) => ({
    type: "choice" as const,
    choice,
    confidence: 0.9,
    probabilities: Object.fromEntries(
      Object.keys(criteria).map((key) => [key, key === choice ? 1 : 0]),
    ),
  });
  return {
    model,
    answers: {
      kind: answer(triageChoices.kind, "notification"),
      attention: answer(triageChoices.attention, "action"),
      lifecycle: answer(triageChoices.lifecycle, "request"),
    },
    usage: { input_tokens: 100, output_tokens: 10 },
  };
}
