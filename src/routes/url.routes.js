import { Router } from "express";
import {
  createUrlController,
  listUrlsController,
  updateUrlController,
  deleteUrlController,
} from "../controllers/url.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, listUrlsController);
router.post("/", requireAuth, createUrlController);
router.patch("/:id", requireAuth, updateUrlController);
router.delete("/:id", requireAuth, deleteUrlController);

export default router;
