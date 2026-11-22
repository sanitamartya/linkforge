import { Prisma } from "../generated/prisma/client.ts";

import { logger } from "../config/logger.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import { registerUser, loginUser } from "../services/auth.service.js";

export async function registerController(req, res) {
  const validation = registerSchema.safeParse(req.body ?? {});

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
    const user = await registerUser(validation.data);

    return res.status(201).json({
      user,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return res.status(409).json({
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email already exists.",
        },
      });
    }

    logger.error({ err: error }, "User registration failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to register user.",
      },
    });
  }
}

export async function loginController(req, res) {
  const validation = loginSchema.safeParse(req.body ?? {});

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
    const result = await loginUser(validation.data);

    if (!result) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        },
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, "User login failed");

    return res.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to log in.",
      },
    });
  }
}
