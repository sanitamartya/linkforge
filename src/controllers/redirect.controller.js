import { getUrlByShortCode } from "../services/url.service.js";

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

    return res.redirect(302, url.originalUrl);
  } catch (error) {
    console.error("URL redirect failed:", error);

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to redirect to the requested URL.",
      },
    });
  }
}
