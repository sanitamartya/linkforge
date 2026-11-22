import { Router } from "express";

import { createUrlController } from "../controllers/url.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, createUrlController);

export default router;
