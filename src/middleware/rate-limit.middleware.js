import { rateLimit } from "express-rate-limit";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export function createRateLimiter({
  windowMs = FIFTEEN_MINUTES,
  limit = 100,
  message = "Too many requests. Please try again later.",
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message,
    },
  });
}

export const apiRateLimiter = createRateLimiter({
  limit: 100,
  message: "Too many URL creation requests. Please try again later.",
});

export const registerRateLimiter = createRateLimiter({
  limit: 10,
  message: "Too many registration attempts. Please try again later.",
});

export const loginRateLimiter = createRateLimiter({
  limit: 10,
  message: "Too many login attempts. Please try again later.",
});
