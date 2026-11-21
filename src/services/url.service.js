import { prisma } from "../config/database.js";
import { generateShortCode } from "../utils/short-code.js";
import { redis } from "../config/redis.js";

const MAX_RETRIES = 5;

export async function createUrl(originalUrl) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const shortCode = generateShortCode();

    try {
      const url = await prisma.url.create({
        data: {
          originalUrl,
          shortCode,
        },
      });

      return url;
    } catch (error) {
      // Retry only when the short code conflicts
      // with an existing database record.
      if (error.code === "P2002" && attempt < MAX_RETRIES) {
        continue;
      }

      if (error.code === "P2002") {
        throw new Error(
          "Unable to generate a unique short code. Please try again.",
        );
      }

      throw error;
    }
  }
}

const URL_CACHE_TTL_SECONDS = 60 * 60;

export async function getUrlByShortCode(shortCode) {
  const cacheKey = `url:${shortCode}`;

  // Read from Redis only when the client is ready.
  if (redis.isReady) {
    try {
      const cachedUrl = await redis.get(cacheKey);

      if (cachedUrl) {
        return JSON.parse(cachedUrl);
      }
    } catch (error) {
      console.error("Redis cache read failed:", error);
    }
  }

  // Cache miss or Redis unavailable: query PostgreSQL.
  const url = await prisma.url.findUnique({
    where: {
      shortCode,
    },
  });

  // Cache the result only when Redis is ready.
  if (url && redis.isReady) {
    try {
      await redis.setEx(cacheKey, URL_CACHE_TTL_SECONDS, JSON.stringify(url));
    } catch (error) {
      console.error("Redis cache write failed:", error);
    }
  }

  return url;
}
