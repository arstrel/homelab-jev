import type { GmailTiming } from "../../src/adapters/gmail.js";

/** Advance virtual monotonic time without real delays in unrelated transport fixtures. */
export function immediateGmailTiming(): GmailTiming {
  let milliseconds = 0;
  return {
    now: () => milliseconds,
    wait: async (duration) => {
      milliseconds += duration;
    },
  };
}
