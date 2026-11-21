import app from "./app.js";
import { redis } from "./config/redis.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await redis.connect();
    console.log("Redis connected successfully.");
  } catch (error) {
    console.warn(
      "Redis is unavailable. Continuing without cache.",
      error.message,
    );
  }

  app.listen(PORT, () => {
    console.log(`LinkForge server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start LinkForge:", error);
  process.exit(1);
});
