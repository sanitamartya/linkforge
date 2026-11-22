import { verifyAccessToken } from "../utils/jwt.js";

export async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      },
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      },
    });
  }

  try {
    const payload = await verifyAccessToken(token);

    if (!payload.sub) {
      return res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid access token.",
        },
      });
    }

    req.user = {
      id: payload.sub,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired access token.",
      },
    });
  }
}
