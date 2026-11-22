import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { verifyAccessToken } from "../src/utils/jwt.js";

after(async () => {
  await prisma.$disconnect();
});

test("POST /api/v1/auth/login should return an access token", async () => {
  const email = `login-${randomUUID()}@example.com`;
  const password = "StrongTestPassword123";

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });

  try {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.id, user.id);
    assert.equal(response.body.user.email, email);
    assert.ok(response.body.accessToken);

    const payload = await verifyAccessToken(response.body.accessToken);

    assert.equal(payload.sub, user.id);
  } finally {
    await prisma.user.delete({
      where: { id: user.id },
    });
  }
});

test("POST /api/v1/auth/login should reject an incorrect password", async () => {
  const email = `wrong-password-${randomUUID()}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("CorrectPassword123", 12),
    },
  });

  try {
    const response = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "IncorrectPassword123",
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
  } finally {
    await prisma.user.delete({
      where: { id: user.id },
    });
  }
});

test("POST /api/v1/auth/login should reject an unknown email", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: `unknown-${randomUUID()}@example.com`,
      password: "SomePassword123",
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "INVALID_CREDENTIALS");
});

test("POST /api/v1/auth/login should reject invalid input", async () => {
  const response = await request(app).post("/api/v1/auth/login").send({
    email: "invalid-email",
    password: "",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});
