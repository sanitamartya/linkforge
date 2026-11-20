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

  // Handle unexpected server errors.
  console.error("Unhandled application error:", error);

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred.",
    },
  });
}
