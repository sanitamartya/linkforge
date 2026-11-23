import { Router } from "express";

import {
  registerController,
  loginController,
} from "../controllers/auth.controller.js";

import {
  registerRateLimiter,
  loginRateLimiter,
} from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/register", registerRateLimiter, registerController);
router.post("/login", loginRateLimiter, loginController);

export default router;
