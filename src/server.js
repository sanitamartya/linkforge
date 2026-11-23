import app from "./app.js";
import { redis } from "./config/redis.js";
import { prisma } from "./config/database.js";
import { logger } from "./config/logger.js";

const PORT = process.env.PORT || 3000;

let server;
let isShuttingDown = false;

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

  server = app.listen(PORT, () => {
    logger.info({ port: PORT }, "LinkForge server started");
  });

  server.on("error", (error) => {
    logger.fatal({ err: error }, "HTTP server error");
    process.exitCode = 1;
  });
}

async function cleanup() {
  const results = await Promise.allSettled([
    redis.isOpen ? redis.quit() : Promise.resolve(),
    prisma.$disconnect(),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error({ err: result.reason }, "Error during application cleanup");

      process.exitCode = 1;
    }
  }

  logger.info("LinkForge shutdown complete");
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info({ signal }, "Shutting down LinkForge");

  if (!server) {
    await cleanup();
    return;
  }

  server.close(async (error) => {
    if (error) {
      logger.error({ err: error }, "Error closing HTTP server");

      process.exitCode = 1;
    }

    await cleanup();
  });
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

startServer().catch(async (error) => {
  logger.fatal({ err: error }, "Failed to start LinkForge");

  await cleanup();

  process.exitCode = 1;
});
