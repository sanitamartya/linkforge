import express from "express";

import urlRoutes from "./routes/url.routes.js";
import { redirectController } from "./controllers/redirect.controller.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/:shortCode", redirectController);

// URL shortening API routes
app.use("/api/v1/urls", urlRoutes);

export default app;
