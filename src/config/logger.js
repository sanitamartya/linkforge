import pino from "pino";

export const loggerOptions = {
  level: process.env.LOG_LEVEL || "info",

  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-api-key"]',
    ],
    censor: "[REDACTED]",
  },
};

export const logger = pino(loggerOptions);
