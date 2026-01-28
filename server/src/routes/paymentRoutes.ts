import express, { Router } from "express";
import {
  createCheckoutSession,
  handleWebhook,
} from "../controllers/paymentController";
import { attachUser } from "../middleware/attachUser";

const router = Router();

// Standard JSON route for frontend
router.post("/checkout", attachUser, createCheckoutSession);

// RAW route for Stripe Webhook
// Note: We will mount this separately in index.ts to bypass standard JSON parsing
export const webhookRouter = Router();
webhookRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook,
);

export default router;
