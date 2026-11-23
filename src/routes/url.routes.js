import { Router } from "express";

import {
  createUrlController,
  listUrlsController,
  updateUrlController,
  deleteUrlController,
} from "../controllers/url.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { apiRateLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.get("/", requireAuth, listUrlsController);
router.post("/", requireAuth, apiRateLimiter, createUrlController);
router.patch("/:id", requireAuth, updateUrlController);
router.delete("/:id", requireAuth, deleteUrlController);

export default router;
