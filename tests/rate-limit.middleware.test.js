import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { createRateLimiter } from "../src/middleware/rate-limit.middleware.js";

test("rate limiter should reject requests after the configured limit", async () => {
  const app = express();

  const testRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    limit: 2,
    message: "Test rate limit exceeded.",
  });

  app.get("/limited", testRateLimiter, (req, res) => {
    res.status(200).json({
      message: "Request allowed",
    });
  });

  const firstResponse = await request(app).get("/limited");
  const secondResponse = await request(app).get("/limited");
  const thirdResponse = await request(app).get("/limited");

  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);

  assert.equal(thirdResponse.status, 429);
  assert.deepEqual(thirdResponse.body, {
    message: "Test rate limit exceeded.",
  });
});
