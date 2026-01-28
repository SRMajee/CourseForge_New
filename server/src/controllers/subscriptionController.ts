import { Request, Response } from "express";
import { stripe } from "../config/stripe";
import { User } from "../models/User";
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

    // 1. Fetch Subscription
    // ✅ FIX: Cast to 'any' to avoid TS errors with Response<Subscription> wrapper
    const subscription = (await stripe.subscriptions.retrieve(
      user.subscriptionId,
    )) as any;

    // 2. Fetch Payment Method (to get last4 digits)
    let cardLast4 = "••••";
    if (subscription.default_payment_method) {
      const paymentMethod = await stripe.paymentMethods.retrieve(
        subscription.default_payment_method as string,
      );
      if (paymentMethod.card) {
        cardLast4 = paymentMethod.card.last4;
      }
    }

    // 3. Return Clean Data
    return res.json({
      status: subscription.status,
      // ✅ Now safe to access properties
      currentPeriodEnd: subscription.current_period_end,
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

    // Create the session
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
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

    // Update Stripe: Set 'cancel_at_period_end' to true
    // ✅ FIX: Cast here as well just in case
    const subscription = (await stripe.subscriptions.update(
      user.subscriptionId,
      { cancel_at_period_end: true },
    )) as any;

    // Update Local DB
    user.subscriptionStatus = "canceled";
    await user.save();

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
