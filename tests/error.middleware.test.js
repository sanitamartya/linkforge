import test from "node:test";
import assert from "node:assert/strict";

import { errorMiddleware } from "../src/middleware/error.middleware.js";

test("error middleware should return a generic 500 response", () => {
  const response = {
    statusCode: null,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };

  const error = new Error("Internal database details");

  errorMiddleware(error, {}, response, () => {});

  assert.equal(response.statusCode, 500);

  assert.deepEqual(response.body, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });

  assert.equal(
    JSON.stringify(response.body).includes("Internal database details"),
    false,
  );
});
