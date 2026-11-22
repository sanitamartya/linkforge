import { Router } from "express";

import {
  createUrlController,
  listUrlsController,
} from "../controllers/url.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, listUrlsController);
router.post("/", requireAuth, createUrlController);

export default router;
