import { createUrlSchema, updateUrlSchema } from "../schemas/url.schema.js";

import {
  createUrl,
  listUrlsForUser,
  updateUrlForUser,
  deleteUrlForUser,
} from "../services/url.service.js";

import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

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

    const shortUrl = `${env.appBaseUrl}/${url.shortCode}`;

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

export async function updateUrlController(req, res) {
  const validation = updateUrlSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: "Invalid URL input",
      errors: validation.error.flatten(),
    });
  }

  try {
    const updatedUrl = await updateUrlForUser({
      urlId: req.params.id,
      userId: req.user.id,
      originalUrl: validation.data.originalUrl,
    });

    if (!updatedUrl) {
      return res.status(404).json({
        message: "URL not found",
      });
    }

    return res.status(200).json({
      id: updatedUrl.id,
      shortCode: updatedUrl.shortCode,
      originalUrl: updatedUrl.originalUrl,
      shortUrl: `${env.appBaseUrl}/${updatedUrl.shortCode}`,
      createdAt: updatedUrl.createdAt,
      updatedAt: updatedUrl.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, urlId: req.params.id }, "Failed to update URL");

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function deleteUrlController(req, res) {
  try {
    const deletedUrl = await deleteUrlForUser({
      urlId: req.params.id,
      userId: req.user.id,
    });

    if (!deletedUrl) {
      return res.status(404).json({
        message: "URL not found",
      });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error({ err: error, urlId: req.params.id }, "Failed to delete URL");

    return res.status(500).json({
      message: "Internal server error",
    });
  }
}
