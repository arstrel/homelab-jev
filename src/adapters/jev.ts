import { TypeSafeClient } from "@typesafe-ai/sdk";

export function jevClient(apiKey: string) {
  return new TypeSafeClient({ apiKey, timeout: 5000, retry: { maxRetries: 0 }, logLevel: "off" });
}
export async function checkJev(apiKey: string) {
  const models = await jevClient(apiKey).models.list();
  return { models: models.length };
}
