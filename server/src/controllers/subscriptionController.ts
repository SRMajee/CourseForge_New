import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { User } from "../models/User";
import { env } from "../config/env";
import logger from "../utils/logger";

/**
 * GET /api/v1/subscription/current
 */
export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user || !user.subscriptionId) {
      return res.status(404).json({ message: "No active subscription found." });
    }

    // 1. Fetch Subscription from Stripe
    const subscription = (await stripe.subscriptions.retrieve(
      user.subscriptionId,
    )) as any;

    // 2. Debug Log (Check your terminal if "Unknown Date" persists)
    if (!subscription.current_period_end) {
      logger.warn(
        `⚠️ Stripe Subscription ${user.subscriptionId} missing period_end`,
      );
      // console.log("Full Stripe Response:", JSON.stringify(subscription, null, 2));
    }

    // 3. Robust Date Resolver
    // Priority: Stripe Data -> DB Backup -> Current Time
    let currentPeriodEnd = subscription.current_period_end;

    if (!currentPeriodEnd && user.currentPeriodEnd) {
      // Fallback to DB (Convert Date object to Unix Timestamp in Seconds)
      currentPeriodEnd = Math.floor(
        new Date(user.currentPeriodEnd).getTime() / 1000,
      );
    }

    // 4. Fetch Payment Method (Card Details)
    let cardLast4 = "••••";
    try {
      if (subscription.default_payment_method) {
        const pmId =
          typeof subscription.default_payment_method === "string"
            ? subscription.default_payment_method
            : subscription.default_payment_method.id;

        const paymentMethod = await stripe.paymentMethods.retrieve(pmId);
        if (paymentMethod.card) {
          cardLast4 = paymentMethod.card.last4;
        }
      }
    } catch (e) {
      logger.warn("Could not fetch payment method details");
    }

    return res.json({
      status: subscription.status,
      currentPeriodEnd: currentPeriodEnd || Math.floor(Date.now() / 1000), // Ultimate fallback
      planName: "Pro Plan",
      cardLast4,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  } catch (error: any) {
    logger.error("❌ Get Subscription Error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch subscription details" });
  }
};

/**
 * POST /api/v1/subscription/portal
 */
export const createPortalSession = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ message: "No customer record found." });
    }

    // Ensure return_url uses the correct ENV variable
    const returnUrl = `${env.CLIENT_URL}/dashboard`;

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl || `${env.CLIENT_URL}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (error: any) {
    logger.error("❌ Create Portal Error:", error);
    return res.status(500).json({ message: "Failed to create portal session" });
  }
};

/**
 * POST /api/v1/subscription/cancel
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user || !user.subscriptionId) {
      return res
        .status(400)
        .json({ message: "No active subscription to cancel." });
    }

    // Update Stripe
    const subscription = (await stripe.subscriptions.update(
      user.subscriptionId,
      { cancel_at_period_end: true },
    )) as any;

    logger.info(
      `🚫 User ${userId} cancelled subscription (ends ${subscription.current_period_end})`,
    );

    return res.json({
      message: "Subscription cancelled successfully",
      cancelAt: subscription.current_period_end,
    });
  } catch (error: any) {
    logger.error("❌ Cancel Subscription Error:", error);
    return res.status(500).json({ message: "Failed to cancel subscription" });
  }
};
/**
 * POST /api/v1/subscription/resume
 * Reactivates a subscription that was scheduled for cancellation
 */
export const resumeSubscription = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user || !user.subscriptionId) {
      return res.status(400).json({ message: "No active subscription found." });
    }

    // Update Stripe: set cancel_at_period_end to FALSE
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info(`✅ User ${userId} resumed subscription`);

    return res.json({ message: "Subscription resumed successfully" });
  } catch (error: any) {
    logger.error("❌ Resume Subscription Error:", error);
    return res.status(500).json({ message: "Failed to resume subscription" });
  }
};
