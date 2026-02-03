import Stripe from "stripe";
import { env } from "./env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover" as any,
  typescript: true,
});

// 1. One-Time Top-Ups
export const CREDIT_PACKS = {
  TOP_UP_SMALL: {
    id: "top_up_small",
    name: `Top Up (${env.CREDITS_TOPUP_AMOUNT} Credits)`,
    credits: env.CREDITS_TOPUP_AMOUNT,
    priceInRupees: env.PRICE_TOPUP_INR,
    priceId: env.STRIPE_PRICE_ID_TOPUP, // 👈 Loaded from ENV
  },
};

// 2. Monthly Subscriptions
export const SUBSCRIPTION_PLANS = {
  PRO_MONTHLY: {
    id: "pro_monthly",
    name: "CourseForge Pro",
    creditsPerMonth: env.CREDITS_PRO_AMOUNT,
    priceInRupees: env.PRICE_PRO_INR,
    priceId: env.STRIPE_PRICE_ID_PRO, // 👈 Loaded from ENV
  },
};
