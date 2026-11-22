import { createClient } from "redis";
import { logger } from "./logger.js";

export const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (error) => {
  logger.error({ err: error }, "Redis client error");
});
