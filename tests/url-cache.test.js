import test from "node:test";
import assert from "node:assert/strict";

import { redis } from "../src/config/redis.js";
import { prisma } from "../src/config/database.js";
import { createUrl, getUrlByShortCode } from "../src/services/url.service.js";

test("URL lookup should cache database results and serve cache hits", async () => {
  let url;

  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    // Create a database record for this test.
    url = await createUrl("https://example.com/cache-test");

    const cacheKey = `url:${url.shortCode}`;

    // Ensure this test starts with a cache miss.
    await redis.del(cacheKey);

    // Cache miss: fetch from PostgreSQL and populate Redis.
    const firstResult = await getUrlByShortCode(url.shortCode);

    assert.equal(firstResult.originalUrl, "https://example.com/cache-test");

    const cachedValue = await redis.get(cacheKey);

    assert.ok(cachedValue);
    assert.equal(JSON.parse(cachedValue).shortCode, url.shortCode);

    // Remove the database record to prove the next lookup uses Redis.
    await prisma.url.delete({
      where: {
        id: url.id,
      },
    });

    // Cache hit: the record should still be returned from Redis.
    const secondResult = await getUrlByShortCode(url.shortCode);

    assert.equal(secondResult.originalUrl, "https://example.com/cache-test");
  } finally {
    if (url) {
      await redis.del(`url:${url.shortCode}`).catch(() => {});
      await prisma.url
        .delete({
          where: {
            id: url.id,
          },
        })
        .catch(() => {});
    }

    if (redis.isOpen) {
      await redis.quit();
    }

    await prisma.$disconnect();
  }
});
