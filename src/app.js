import express from "express";
import pinoHttp from "pino-http";
import { logger } from "./config/logger.js";

import urlRoutes from "./routes/url.routes.js";
import { redirectController } from "./controllers/redirect.controller.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(
  pinoHttp({
    logger,
  }),
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/:shortCode", redirectController);

app.use("/api/v1/auth", authRoutes);

// URL shortening API routes
app.use("/api/v1/urls", urlRoutes);

// Centralized error handling (must be last)
app.use(errorMiddleware);

export default app;
