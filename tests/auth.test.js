import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";

after(async () => {
  await prisma.$disconnect();
});

test("POST /api/v1/auth/register should create a user safely", async () => {
  const email = `register-${randomUUID()}@example.com`;
  const password = "StrongTestPassword123";

  let userId;

  try {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password });

    assert.equal(response.status, 201);

    assert.deepEqual(
      Object.keys(response.body.user).sort(),
      ["createdAt", "email", "id"].sort(),
    );

    assert.equal(response.body.user.email, email);

    userId = response.body.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    assert.ok(user);
    assert.notEqual(user.passwordHash, password);

    assert.equal(await bcrypt.compare(password, user.passwordHash), true);
  } finally {
    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }
  }
});

test("POST /api/v1/auth/register should reject invalid input", async () => {
  const response = await request(app).post("/api/v1/auth/register").send({
    email: "not-an-email",
    password: "short",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/v1/auth/register should reject duplicate email", async () => {
  const email = `duplicate-${randomUUID()}@example.com`;
  const password = "StrongTestPassword123";

  let userId;

  try {
    const firstResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password });

    assert.equal(firstResponse.status, 201);

    userId = firstResponse.body.user.id;

    const duplicateResponse = await request(app)
      .post("/api/v1/auth/register")
      .send({ email, password });

    assert.equal(duplicateResponse.status, 409);
    assert.equal(duplicateResponse.body.error.code, "EMAIL_ALREADY_EXISTS");
  } finally {
    if (userId) {
      await prisma.user.delete({
        where: { id: userId },
      });
    }
  }
});
