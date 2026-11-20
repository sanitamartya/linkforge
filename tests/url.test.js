import test, { after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";

after(async () => {
  await prisma.$disconnect();
});

test("POST /api/v1/urls should create a short URL and redirect correctly", async () => {
  let createdUrlId;

  try {
    // Create a short URL.
    const createResponse = await request(app).post("/api/v1/urls").send({
      originalUrl: "https://example.com/integration-test",
    });

    assert.equal(createResponse.status, 201);
    assert.equal(
      createResponse.body.originalUrl,
      "https://example.com/integration-test",
    );
    assert.match(createResponse.body.shortCode, /^[A-Za-z0-9]{6}$/);

    createdUrlId = createResponse.body.id;

    // Verify the short URL redirects correctly.
    const redirectResponse = await request(app).get(
      `/${createResponse.body.shortCode}`,
    );

    assert.equal(redirectResponse.status, 302);
    assert.equal(
      redirectResponse.headers.location,
      "https://example.com/integration-test",
    );
  } finally {
    // Remove the test record from PostgreSQL.
    if (createdUrlId) {
      await prisma.url.delete({
        where: {
          id: createdUrlId,
        },
      });
    }
  }
});

test("POST /api/v1/urls should reject an invalid URL", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: "ftp://example.com",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("GET /:shortCode should return 404 for an unknown short code", async () => {
  const response = await request(app).get("/unknown123");

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, "URL_NOT_FOUND");
});

test("POST /api/v1/urls should reject malformed JSON", async () => {
  const response = await request(app)
    .post("/api/v1/urls")
    .set("Content-Type", "application/json")
    .send('{"originalUrl":"https://example.com"');

  assert.equal(response.status, 400);

  assert.deepEqual(response.body, {
    error: {
      code: "INVALID_JSON",
      message: "Request body contains invalid JSON.",
    },
  });
});

test("POST /api/v1/urls should reject a missing originalUrl", async () => {
  const response = await request(app).post("/api/v1/urls").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.error.details[0].field, "originalUrl");
});

test("POST /api/v1/urls should reject an empty request body", async () => {
  const response = await request(app)
    .post("/api/v1/urls")
    .set("Content-Type", "application/json");

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.error.details[0].field, "originalUrl");
});

test("POST /api/v1/urls should reject unexpected fields", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: "https://example.com",
    isAdmin: true,
    role: "admin",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");

  assert.match(response.body.error.message, /Unrecognized keys/);
});
