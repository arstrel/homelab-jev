import { MailReadError } from "../domain/mail-evidence.js";

export const mailLimits = {
  concurrency: 3,
  deadlineMs: 120_000,
  requestTimeoutMs: 10_000,
  maxRequests: 200,
  maxMessages: 200,
  maxDepth: 20,
  maxParts: 2_000,
  maxBodyBytes: 1_048_576,
  maxEvidenceBytes: 10_485_760,
  maxResponseBytes: 4_194_304,
} as const;
export type MailLimits = { [K in keyof typeof mailLimits]: number };

/** One shared budget for authentication, discovery, thread and body-part reads. */
export class MailBudget {
  readonly signal: AbortSignal;
  readonly limits: MailLimits;
  requests = 0;
  evidenceBytes = 0;
  private readonly controller = new AbortController();
  private readonly timer: ReturnType<typeof setTimeout>;
  private readonly started = performance.now();
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(limits: Partial<MailLimits> = {}, external?: AbortSignal) {
    this.limits = { ...mailLimits, ...limits };
    if (Object.values(this.limits).some((n) => !Number.isSafeInteger(n) || n <= 0))
      throw new MailReadError("invalid-data");
    this.signal = external
      ? AbortSignal.any([external, this.controller.signal])
      : this.controller.signal;
    this.timer = setTimeout(
      () => this.controller.abort(new MailReadError("deadline")),
      this.limits.deadlineMs,
    );
  }
  assertActive() {
    if (this.signal.aborted)
      throw this.signal.reason instanceof MailReadError
        ? this.signal.reason
        : new MailReadError("cancelled");
    if (performance.now() - this.started >= this.limits.deadlineMs) {
      this.controller.abort(new MailReadError("deadline"));
      throw new MailReadError("deadline");
    }
  }
  requestOptions() {
    this.assertActive();
    return {
      signal: this.signal,
      timeout: Math.max(
        1,
        Math.min(
          this.limits.requestTimeoutMs,
          Math.ceil(this.limits.deadlineMs - (performance.now() - this.started)),
        ),
      ),
      retry: false as const,
      retryConfig: { retry: 0, noResponseRetries: 0 },
      maxContentLength: this.limits.maxResponseBytes,
    };
  }
  reserveBody(bytes: number) {
    this.assertActive();
    if (
      bytes > this.limits.maxBodyBytes ||
      this.evidenceBytes + bytes > this.limits.maxEvidenceBytes
    )
      throw new MailReadError("too-large");
    this.evidenceBytes += bytes;
  }
  async read<T>(operation: () => Promise<T>): Promise<T> {
    this.assertActive();
    if (this.active >= this.limits.concurrency) {
      await new Promise<void>((resolve, reject) => {
        const ready = () => {
          this.active++;
          this.signal.removeEventListener("abort", abort);
          resolve();
        };
        const abort = () => {
          const index = this.waiting.indexOf(ready);
          if (index >= 0) this.waiting.splice(index, 1);
          reject(
            this.signal.reason instanceof MailReadError
              ? this.signal.reason
              : new MailReadError("cancelled"),
          );
        };
        this.waiting.push(ready);
        this.signal.addEventListener("abort", abort, { once: true });
      });
    } else this.active++;
    try {
      this.assertActive();
      if (this.requests >= this.limits.maxRequests) throw new MailReadError("request-limit");
      this.requests++;
      return await operation();
    } finally {
      this.active--;
      this.waiting.shift()?.();
    }
  }
  close() {
    clearTimeout(this.timer);
  }
}
