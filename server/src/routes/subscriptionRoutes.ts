import express from "express";
import { attachUser } from "../middleware/attachUser";
import {
  getCurrentSubscription,
  createPortalSession,
  cancelSubscription,
} from "../controllers/subscriptionController";

const router = express.Router();

// All routes require authentication
router.use(attachUser);

router.get("/current", getCurrentSubscription);
router.post("/portal", createPortalSession);
router.post("/cancel", cancelSubscription);

export default router;