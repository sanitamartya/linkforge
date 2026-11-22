import app from "./app.js";
import { redis } from "./config/redis.js";
import { logger } from "./config/logger.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await redis.connect();
    logger.info("Redis connected successfully.");
  } catch (error) {
    logger.warn(
      { err: error },
      "Redis is unavailable. Continuing without cache.",
    );
  }

  app.listen(PORT, () => {
    logger.info({ port: PORT }, "LinkForge server started");
  });
}

startServer().catch((error) => {
  logger.fatal({ err: error }, "Failed to start LinkForge");
  process.exit(1);
});
