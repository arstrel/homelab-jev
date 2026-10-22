import { choice } from "@typesafe-ai/sdk";
import type { RetroRequest } from "../domain/retro-review.js";
import { validateRetroRequest } from "../domain/retro-review.js";
import { jevClient } from "./jev.js";

export function jevRetro(key: string) {
  const client = jevClient(key);
  return async (request: RetroRequest, signal: AbortSignal): Promise<unknown> => {
    validateRetroRequest(request);
    return client.systemOne(
      {
        ...request,
        questions: Object.fromEntries(
          Object.entries(request.questions).map(([k, q]) => [
            k,
            choice(q.instructions, q.criteria),
          ]),
        ),
      },
      { signal },
    );
  };
}
