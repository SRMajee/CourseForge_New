import { Request, Response } from "express";
import { redisClient } from "../config/redis";
import { env } from "../config/env";
import { CREDIT_COSTS, COST_MENU } from "../config/credits"; // Ensure this imports your backend constants
import { CREDIT_PACKS, SUBSCRIPTION_PLANS } from "../config/stripe";

const CONFIG_CACHE_KEY = "app:global_config";
const CACHE_TTL = 3600; // Cache for 1 hour

export const getAppConfig = async (req: Request, res: Response) => {
  try {
    // 1. Try fetching from Redis first
    const cachedConfig = await redisClient.get(CONFIG_CACHE_KEY);
    if (cachedConfig) {
      return res.json(JSON.parse(cachedConfig));
    }

    // 2. Construct the Config Object (Source of Truth)
    const config = {
      costs: {
        createCourse: CREDIT_COSTS.CREATE_COURSE,
        generateLesson: CREDIT_COSTS.GENERATE_LESSON,
        generateAudio: CREDIT_COSTS.GENERATE_AUDIO,
        exportPdf: CREDIT_COSTS.EXPORT_PDF,
        regenerate: 15, // If this is hardcoded, move it to env/constants
      },
      costMenu: COST_MENU,
      pricing: {
        topUp: {
          price: env.PRICE_TOPUP_INR,
          credits: env.CREDITS_TOPUP_AMOUNT,
          label: CREDIT_PACKS.TOP_UP_SMALL.name,
        },
        pro: {
          price: env.PRICE_PRO_INR,
          credits: env.CREDITS_PRO_AMOUNT,
          label: SUBSCRIPTION_PLANS.PRO_MONTHLY.name,
        },
      },
    };

    // 3. Store in Redis
    await redisClient.set(
      CONFIG_CACHE_KEY,
      JSON.stringify(config),
      "EX",
      CACHE_TTL,
    );

    return res.json(config);
  } catch (error) {
    console.error("Failed to fetch config", error);
    res.status(500).json({ message: "Config load failed" });
  }
};
