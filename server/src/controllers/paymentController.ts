import { Request, Response } from "express";
import { stripe, CREDIT_PACKS, SUBSCRIPTION_PLANS } from "../config/stripe";
import { env } from "../config/env";
import { User } from "../models/User";
import { creditService } from "../services/creditService";
import logger from "../utils/logger";
import { redisClient } from "../config/redis";

// ✅ NEW HELPER FUNCTION: upgradeUserPlan
export const upgradeUserPlan = async (
  userId: string,
  subscriptionId: string,
  customerId: string,
) => {
  try {
    // 1. Add Credits (Rollover logic) - Assuming PRO plan gets 1000
    await creditService.addCredits(userId, 1000);

    // 2. Fetch latest subscription end date from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // 🛡️ FIX: Cast to 'any' to fix TypeScript error & check for existence
    const subData = subscription as any;

    let periodEnd = new Date();
    if (subData && subData.current_period_end) {
      periodEnd = new Date(subData.current_period_end * 1000);
    } else {
      // Fallback: Set to 30 days from now if Stripe returns null
      logger.warn(
        `⚠️ Subscription ${subscriptionId} missing end date. Using fallback.`,
      );
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    // 3. Update User Record
    await User.findByIdAndUpdate(userId, {
      stripeCustomerId: customerId,
      subscriptionId: subscriptionId,
      subscriptionStatus: "active",
      planType: "PRO",
      currentPeriodEnd: periodEnd,
    });
    await redisClient.del(`user:${userId}:context`);
    logger.info(`✅ User ${userId} upgraded to PRO (Credits Rolled Over)`);
  } catch (error) {
    logger.error(`❌ Upgrade Failed for User ${userId}:`, error);
  }
};

// 1. Create Checkout Session
export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { packId, planId, returnUrl } = req.body;
    // @ts-ignore
    const userId = req.user?._id;
    const baseUrl =
      returnUrl || process.env.FRONTEND_URL || `${env.CLIENT_URL}/dashboard`;
    let priceId, mode, metadata;

    if (packId) {
      const pack = Object.values(CREDIT_PACKS).find((p) => p.id === packId);
      if (!pack) return res.status(400).json({ message: "Invalid pack" });

      priceId = pack.priceId;
      mode = "payment";
      metadata = {
        userId: userId.toString(),
        type: "TOP_UP",
        credits: pack.credits.toString(),
      };
    } else if (planId) {
      const plan = Object.values(SUBSCRIPTION_PLANS).find(
        (p) => p.id === planId,
      );
      if (!plan) return res.status(400).json({ message: "Invalid plan" });

      priceId = plan.priceId;
      mode = "subscription";
      metadata = {
        userId: userId.toString(),
        type: "SUBSCRIPTION",
        planId: plan.id,
      };
    } else {
      return res.status(400).json({ message: "Missing packId or planId" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode as any,
      metadata: metadata,
      success_url: `${baseUrl}?payment=success=true`,
      cancel_url: `${baseUrl}?payment=cancelled=true`,
    });

    res.json({ url: session.url });
  } catch (error) {
    logger.error("Stripe Checkout Error:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

// 2. The Webhook
export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (!sig) throw new Error("Missing signature");
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    logger.error(`Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object as any;

  try {
    // A. Checkout Completed
    if (event.type === "checkout.session.completed") {
      const userId = session.metadata?.userId;
      const type = session.metadata?.type;

      // 1. Top Up (One-Time)
      if (userId && type === "TOP_UP") {
        const credits = parseInt(session.metadata.credits);
        await creditService.addCredits(userId, credits);
        logger.info(`💰 Added ${credits} credits to ${userId}`);
      }

      // 2. New Subscription (First Month)
      if (userId && type === "SUBSCRIPTION") {
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        await upgradeUserPlan(userId, subscriptionId, customerId);
      }
    }

    // B. Monthly Renewal
    if (event.type === "invoice.payment_succeeded") {
      const customerId = session.customer;
      const billingReason = session.billing_reason;

      if (
        billingReason === "subscription_cycle" ||
        billingReason === "subscription_create"
      ) {
        const user = await User.findOne({ stripeCustomerId: customerId });

        if (user) {
          const periodEndTimestamp = session.lines?.data[0]?.period?.end;

          // 🛡️ FIX: Safe Date Parsing for Renewals
          let periodEndDate = undefined;
          if (periodEndTimestamp) {
            periodEndDate = new Date(periodEndTimestamp * 1000);
          }

          // Renew Credits (Reset or Add - kept as Reset based on original code)
          await creditService.addCredits(user._id.toString(), 1000);

          await User.findByIdAndUpdate(user._id, {
            subscriptionStatus: "active",
            currentPeriodEnd: periodEndDate,
          });

          logger.info(
            `🔄 Subscription Renewed: Reset credits & date for ${user.email}`,
          );
        }
      }
    }
  } catch (error) {
    logger.error("Webhook processing error:", error);
  }

  res.json({ received: true });
};
