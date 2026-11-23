import { logger } from "../config/logger.js";

export function errorMiddleware(error, req, res, next) {
  // Handle malformed JSON sent by the client.
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body contains invalid JSON.",
      },
    });
  }

  // Handle JSON request bodies that exceed the configured limit.
  if (error.type === "entity.too.large" || error.status === 413) {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
      },
    });
  }

  // Handle unexpected server errors.
  logger.error({ err: error }, "Unhandled application error");

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
}
