import type { Ledger, Runtime } from "./ports.js";

export async function status(ledger: Ledger, runtime: Runtime) {
  return { checkedAt: runtime.now().toISOString(), ...(await ledger.status()) };
}
