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

    assert.deepEqual(
      Object.keys(createResponse.body).sort(),
      ["createdAt", "id", "originalUrl", "shortCode", "shortUrl"].sort(),
    );

    assert.equal(
      createResponse.body.originalUrl,
      "https://example.com/integration-test",
    );

    assert.match(createResponse.body.id, /^.+$/);
    assert.match(createResponse.body.shortCode, /^[A-Za-z0-9]{6}$/);

    assert.equal(
      createResponse.body.shortUrl,
      `http://localhost:3000/${createResponse.body.shortCode}`,
    );

    assert.ok(Number.isFinite(Date.parse(createResponse.body.createdAt)));

    createdUrlId = createResponse.body.id;

    // Verify the short URL redirects correctly.
    const redirectResponse = await request(app)
      .get(`/${createResponse.body.shortCode}`)
      .set("Referer", "https://example.com/source")
      .set("User-Agent", "LinkForge-Integration-Test");

    assert.equal(redirectResponse.status, 302);
    assert.match(redirectResponse.headers["content-type"], /text\/plain/);
    assert.equal(
      redirectResponse.headers.location,
      "https://example.com/integration-test",
    );

    // Verify that the click event was saved in PostgreSQL.
    const clickEvent = await prisma.clickEvent.findFirst({
      where: {
        urlId: createdUrlId,
      },
    });

    assert.ok(clickEvent, "Click event should be recorded");

    assert.equal(clickEvent.referrer, "https://example.com/source");

    assert.equal(clickEvent.userAgent, "LinkForge-Integration-Test");
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

  assert.ok(response.body.error.message);

  assert.equal(response.body.error.details[0].field, "originalUrl");

  assert.ok(response.body.error.details[0].message);
});

test("GET /:shortCode should return 404 for an unknown short code", async () => {
  const response = await request(app).get("/unknown123");

  assert.equal(response.status, 404);

  assert.deepEqual(response.body, {
    error: {
      code: "URL_NOT_FOUND",
      message: "The requested short URL does not exist.",
    },
  });
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

test("POST /api/v1/urls should accept a URL with surrounding whitespace", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: " https://example.com ",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.originalUrl, "https://example.com");

  await prisma.url.delete({
    where: {
      id: response.body.id,
    },
  });
});

test("POST /api/v1/urls should reject a URL without a protocol", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: "example.com",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/v1/urls should reject an empty URL", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: "",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/v1/urls should accept an HTTP URL", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: "http://example.com",
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.originalUrl, "http://example.com");

  await prisma.url.delete({
    where: {
      id: response.body.id,
    },
  });
});
