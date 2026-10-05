import pino, { type DestinationStream } from "pino";

export function createLogger(destination?: DestinationStream) {
  const options = {
    base: null,
    redact: {
      paths: [
        "password",
        "token",
        "apiKey",
        "connectionString",
        "authorization",
        "*.password",
        "*.token",
        "*.apiKey",
        "*.connectionString",
        "*.authorization",
      ],
      censor: "[REDACTED]",
    },
  };
  const logger = destination ? pino(options, destination) : pino(options);
  // Accept only an event and fixed, non-sensitive dimensions. No raw errors, bodies or configuration.
  return {
    info(event: string, fields: { provider?: string; count?: number; code?: string } = {}) {
      logger.info(fields, event);
    },
  };
}
