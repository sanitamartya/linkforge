import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";

import { requireAuth } from "../src/middleware/auth.middleware.js";
import { createAccessToken } from "../src/utils/jwt.js";

function createTestApp() {
  const app = express();

  app.get("/protected", requireAuth, (req, res) => {
    res.status(200).json({
      userId: req.user.id,
    });
  });

  return app;
}

test("requireAuth should allow a valid access token", async () => {
  const app = createTestApp();
  const userId = "test-user-123";
  const token = await createAccessToken(userId);

  const response = await request(app)
    .get("/protected")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.userId, userId);
});

test("requireAuth should reject a missing token", async () => {
  const app = createTestApp();

  const response = await request(app).get("/protected");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("requireAuth should reject an invalid token", async () => {
  const app = createTestApp();

  const response = await request(app)
    .get("/protected")
    .set("Authorization", "Bearer invalid.token.value");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("requireAuth should reject an unsupported authorization scheme", async () => {
  const app = createTestApp();

  const response = await request(app)
    .get("/protected")
    .set("Authorization", "Basic dGVzdA==");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});
