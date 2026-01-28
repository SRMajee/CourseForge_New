import express from "express";
import Stripe from "stripe";
import { upgradeUserPlan } from "../controllers/paymentController";
import { env } from "../config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }), // Required for signature verification
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      // 1. Verify that the request actually came from Stripe
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the specific event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // 3. Extract metadata we sent when creating the session
      const userId = session.metadata?.userId;
      const planToUpgrade = session.metadata?.planType as
        | "STUDENT"
        | "LIFETIME";
      const credits = parseInt(session.metadata?.creditsToAdd || "0");

      if (userId && planToUpgrade) {
        await upgradeUserPlan(userId, planToUpgrade, credits);
      }
    }

    res.json({ received: true });
  },
);

export default router;
