import { createUrlSchema } from "../schemas/url.schema.js";

import { createUrl, listUrlsForUser } from "../services/url.service.js";

import { logger } from "../config/logger.js";

export async function createUrlController(req, res) {
  // Validate incoming request body.
  const validation = createUrlSchema.safeParse(req.body ?? {});

  if (!validation.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: validation.error.issues[0].message,
        details: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  try {
    const url = await createUrl(validation.data.originalUrl, req.user.id);

    const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    const shortUrl = `${baseUrl.replace(/\/+$/, "")}/${url.shortCode}`;

    return res.status(201).json({
      id: url.id,
      shortCode: url.shortCode,
      originalUrl: url.originalUrl,
      shortUrl,
      createdAt: url.createdAt,
    });
  } catch (error) {
    // Don't expose internal database errors to clients.
    logger.error({ err: error }, "URL creation failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to create short URL.",
      },
    });
  }
}

export async function listUrlsController(req, res) {
  try {
    const urls = await listUrlsForUser(req.user.id);

    return res.status(200).json({
      urls,
    });
  } catch (error) {
    logger.error({ err: error }, "URL listing failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to retrieve URLs.",
      },
    });
  }
}
