import {
  getUrlByShortCode,
  recordClickEvent,
} from "../services/url.service.js";
import { logger } from "../config/logger.js";

export async function redirectController(req, res) {
  try {
    const { shortCode } = req.params;

    const url = await getUrlByShortCode(shortCode);

    if (!url) {
      return res.status(404).json({
        error: {
          code: "URL_NOT_FOUND",
          message: "The requested short URL does not exist.",
        },
      });
    }

    try {
      await recordClickEvent({
        urlId: url.id,
        referrer: req.get("referer"),
        userAgent: req.get("user-agent"),
      });
    } catch (error) {
      logger.error(
        { err: error, shortCode },
        "Failed to record URL click event",
      );
    }

    return res.redirect(302, url.originalUrl);
  } catch (error) {
    logger.error({ err: error }, "URL redirect failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to redirect to the requested URL.",
      },
    });
  }
}
