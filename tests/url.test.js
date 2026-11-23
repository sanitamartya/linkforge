import test, { after } from "node:test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import request from "supertest";

import app from "../src/app.js";
import { prisma } from "../src/config/database.js";
import { createAccessToken } from "../src/utils/jwt.js";

const testUser = await prisma.user.create({
  data: {
    email: `linkforge-url-tests-${randomUUID()}@example.com`,
    passwordHash: "test-only-password-hash",
  },
});

const testAccessToken = await createAccessToken(testUser.id);

function createUrlRequest() {
  return request(app)
    .post("/api/v1/urls")
    .set("Authorization", `Bearer ${testAccessToken}`);
}

function listUrlsRequest() {
  return request(app)
    .get("/api/v1/urls")
    .set("Authorization", `Bearer ${testAccessToken}`);
}

after(async () => {
  await prisma.url.deleteMany({
    where: {
      userId: testUser.id,
    },
  });

  await prisma.user.delete({
    where: {
      id: testUser.id,
    },
  });

  await prisma.$disconnect();
});

test("POST /api/v1/urls should reject a missing access token", async () => {
  const response = await request(app).post("/api/v1/urls").send({
    originalUrl: "https://example.com/no-token",
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("POST /api/v1/urls should create a short URL and redirect correctly", async () => {
  let createdUrlId;

  try {
    const createResponse = await createUrlRequest().send({
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

    const savedUrl = await prisma.url.findUnique({
      where: {
        id: createdUrlId,
      },
    });

    assert.ok(savedUrl, "URL should exist in PostgreSQL");
    assert.equal(savedUrl.userId, testUser.id);

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

    const clickEvent = await prisma.clickEvent.findFirst({
      where: {
        urlId: createdUrlId,
      },
    });

    assert.ok(clickEvent, "Click event should be recorded");
    assert.equal(clickEvent.referrer, "https://example.com/source");
    assert.equal(clickEvent.userAgent, "LinkForge-Integration-Test");
  } finally {
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
  const response = await createUrlRequest().send({
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
  const response = await createUrlRequest()
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
  const response = await createUrlRequest().send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.error.details[0].field, "originalUrl");
});

test("POST /api/v1/urls should reject an empty request body", async () => {
  const response = await createUrlRequest().set(
    "Content-Type",
    "application/json",
  );

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.equal(response.body.error.details[0].field, "originalUrl");
});

test("POST /api/v1/urls should reject an oversized JSON body", async () => {
  const response = await createUrlRequest().send({
    originalUrl: `https://example.com/${"a".repeat(20_000)}`,
  });

  assert.equal(response.status, 413);

  assert.deepEqual(response.body, {
    error: {
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body is too large.",
    },
  });
});

test("POST /api/v1/urls should reject unexpected fields", async () => {
  const response = await createUrlRequest().send({
    originalUrl: "https://example.com",
    isAdmin: true,
    role: "admin",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.match(response.body.error.message, /Unrecognized keys/);
});

test("POST /api/v1/urls should accept a URL with surrounding whitespace", async () => {
  const response = await createUrlRequest().send({
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
  const response = await createUrlRequest().send({
    originalUrl: "example.com",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/v1/urls should reject an empty URL", async () => {
  const response = await createUrlRequest().send({
    originalUrl: "",
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("POST /api/v1/urls should accept an HTTP URL", async () => {
  const response = await createUrlRequest().send({
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

test("GET /api/v1/urls should reject a missing access token", async () => {
  const response = await request(app).get("/api/v1/urls");

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("GET /api/v1/urls should return only URLs owned by the authenticated user", async () => {
  const otherUser = await prisma.user.create({
    data: {
      email: `linkforge-other-user-${randomUUID()}@example.com`,
      passwordHash: "test-only-password-hash",
    },
  });

  let otherUrlId;

  try {
    const ownUrl = await prisma.url.create({
      data: {
        originalUrl: "https://example.com/my-url",
        shortCode: `my${randomUUID().slice(0, 4)}`,
        userId: testUser.id,
      },
    });

    const otherUrl = await prisma.url.create({
      data: {
        originalUrl: "https://example.com/other-user-url",
        shortCode: `ot${randomUUID().slice(0, 4)}`,
        userId: otherUser.id,
      },
    });

    otherUrlId = otherUrl.id;

    const response = await listUrlsRequest();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.urls));

    const returnedIds = response.body.urls.map((url) => url.id);

    assert.ok(returnedIds.includes(ownUrl.id));
    assert.ok(!returnedIds.includes(otherUrl.id));
  } finally {
    if (otherUrlId) {
      await prisma.url.delete({
        where: {
          id: otherUrlId,
        },
      });
    }

    await prisma.user.delete({
      where: {
        id: otherUser.id,
      },
    });
  }
});

test("PATCH /api/v1/urls/:id should reject a missing access token", async () => {
  const url = await prisma.url.create({
    data: {
      originalUrl: "https://example.com/no-token-update",
      shortCode: `nt${randomUUID().slice(0, 4)}`,
      userId: testUser.id,
    },
  });

  const response = await request(app).patch(`/api/v1/urls/${url.id}`).send({
    originalUrl: "https://example.com/updated",
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("PATCH /api/v1/urls/:id should update a URL owned by the user", async () => {
  const url = await prisma.url.create({
    data: {
      originalUrl: "https://example.com/before-update",
      shortCode: `up${randomUUID().slice(0, 4)}`,
      userId: testUser.id,
    },
  });

  const response = await request(app)
    .patch(`/api/v1/urls/${url.id}`)
    .set("Authorization", `Bearer ${testAccessToken}`)
    .send({
      originalUrl: "https://example.com/after-update",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.originalUrl, "https://example.com/after-update");
  assert.equal(response.body.shortCode, url.shortCode);

  const updatedUrl = await prisma.url.findUnique({
    where: {
      id: url.id,
    },
  });

  assert.equal(updatedUrl.originalUrl, "https://example.com/after-update");
});

test("PATCH /api/v1/urls/:id should reject an invalid URL", async () => {
  const url = await prisma.url.create({
    data: {
      originalUrl: "https://example.com/valid",
      shortCode: `iv${randomUUID().slice(0, 4)}`,
      userId: testUser.id,
    },
  });

  const response = await request(app)
    .patch(`/api/v1/urls/${url.id}`)
    .set("Authorization", `Bearer ${testAccessToken}`)
    .send({
      originalUrl: "ftp://example.com",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.message, "Invalid URL input");
  assert.ok(response.body.errors.fieldErrors.originalUrl);
});

test("PATCH /api/v1/urls/:id should not update another user's URL", async () => {
  const otherUser = await prisma.user.create({
    data: {
      email: `linkforge-patch-owner-${randomUUID()}@example.com`,
      passwordHash: "test-only-password-hash",
    },
  });

  let urlId;

  try {
    const url = await prisma.url.create({
      data: {
        originalUrl: "https://example.com/other-owner",
        shortCode: `oo${randomUUID().slice(0, 4)}`,
        userId: otherUser.id,
      },
    });

    urlId = url.id;

    const response = await request(app)
      .patch(`/api/v1/urls/${url.id}`)
      .set("Authorization", `Bearer ${testAccessToken}`)
      .send({
        originalUrl: "https://example.com/should-not-update",
      });

    assert.equal(response.status, 404);

    const savedUrl = await prisma.url.findUnique({
      where: {
        id: url.id,
      },
    });

    assert.equal(savedUrl.originalUrl, "https://example.com/other-owner");
  } finally {
    if (urlId) {
      await prisma.url.delete({
        where: {
          id: urlId,
        },
      });
    }

    await prisma.user.delete({
      where: {
        id: otherUser.id,
      },
    });
  }
});

test("DELETE /api/v1/urls/:id should reject a missing access token", async () => {
  const url = await prisma.url.create({
    data: {
      originalUrl: "https://example.com/delete-no-token",
      shortCode: `dn${randomUUID().slice(0, 4)}`,
      userId: testUser.id,
    },
  });

  const response = await request(app).delete(`/api/v1/urls/${url.id}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, "UNAUTHORIZED");
});

test("DELETE /api/v1/urls/:id should delete the user's URL", async () => {
  const url = await prisma.url.create({
    data: {
      originalUrl: "https://example.com/delete-me",
      shortCode: `de${randomUUID().slice(0, 4)}`,
      userId: testUser.id,
    },
  });

  await prisma.clickEvent.create({
    data: {
      urlId: url.id,
      referrer: "https://example.com",
      userAgent: "LinkForge-Delete-Test",
    },
  });

  // Populate Redis cache before deleting.
  const redirectBeforeDelete = await request(app).get(`/${url.shortCode}`);

  assert.equal(redirectBeforeDelete.status, 302);

  const response = await request(app)
    .delete(`/api/v1/urls/${url.id}`)
    .set("Authorization", `Bearer ${testAccessToken}`);

  assert.equal(response.status, 204);
  assert.equal(response.text, "");

  const deletedUrl = await prisma.url.findUnique({
    where: {
      id: url.id,
    },
  });

  assert.equal(deletedUrl, null);

  const deletedClickEvent = await prisma.clickEvent.findFirst({
    where: {
      urlId: url.id,
    },
  });

  assert.equal(deletedClickEvent, null);

  // Deleted short URL should no longer redirect.
  const redirectAfterDelete = await request(app).get(`/${url.shortCode}`);

  assert.equal(redirectAfterDelete.status, 404);
});

test("DELETE /api/v1/urls/:id should not delete another user's URL", async () => {
  const otherUser = await prisma.user.create({
    data: {
      email: `linkforge-delete-owner-${randomUUID()}@example.com`,
      passwordHash: "test-only-password-hash",
    },
  });

  let urlId;

  try {
    const url = await prisma.url.create({
      data: {
        originalUrl: "https://example.com/another-owner",
        shortCode: `do${randomUUID().slice(0, 4)}`,
        userId: otherUser.id,
      },
    });

    urlId = url.id;

    const response = await request(app)
      .delete(`/api/v1/urls/${url.id}`)
      .set("Authorization", `Bearer ${testAccessToken}`);

    assert.equal(response.status, 404);
    assert.equal(response.body.message, "URL not found");

    const savedUrl = await prisma.url.findUnique({
      where: {
        id: url.id,
      },
    });

    assert.ok(savedUrl);
    assert.equal(savedUrl.userId, otherUser.id);
  } finally {
    if (urlId) {
      await prisma.url.delete({
        where: {
          id: urlId,
        },
      });
    }

    await prisma.user.delete({
      where: {
        id: otherUser.id,
      },
    });
  }
});

test("DELETE /api/v1/urls/:id should return 404 for an unknown URL", async () => {
  const response = await request(app)
    .delete(`/api/v1/urls/unknown-${randomUUID()}`)
    .set("Authorization", `Bearer ${testAccessToken}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.message, "URL not found");
});
