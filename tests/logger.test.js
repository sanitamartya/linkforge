import assert from "node:assert/strict";
import { Writable } from "node:stream";
import test from "node:test";
import pino from "pino";

import { loggerOptions } from "../src/config/logger.js";

test("logger should redact sensitive request headers", () => {
  let output = "";

  const destination = new Writable({
    write(chunk, encoding, callback) {
      output += chunk.toString();
      callback();
    },
  });

  const testLogger = pino(loggerOptions, destination);

  testLogger.info(
    {
      req: {
        headers: {
          authorization: "Bearer test-secret-token",
          cookie: "session=test-secret-cookie",
          "x-api-key": "test-secret-api-key",
        },
      },
    },
    "test request",
  );

  assert.equal((output.match(/\[REDACTED\]/g) || []).length, 3);

  assert.doesNotMatch(output, /test-secret-token/);
  assert.doesNotMatch(output, /test-secret-cookie/);
  assert.doesNotMatch(output, /test-secret-api-key/);
});
