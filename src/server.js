import app from "./app.js";
import { redis } from "./config/redis.js";

const PORT = process.env.PORT || 3000;

async function startServer() {
  await redis.connect();

  console.log("Redis connected successfully.");

  app.listen(PORT, () => {
    console.log(`LinkForge server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start LinkForge:", error);
  process.exit(1);
});
