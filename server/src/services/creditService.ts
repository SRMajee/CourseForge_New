import { redisClient } from "../config/redis";
import { User } from "../models/User";
import logger from "../utils/logger";
import { socketService } from "./socketService";

export const creditService = {
  /**
   * Fast Read: Get current balance from Redis (or sync from Mongo)
   */
  getBalance: async (userId: string): Promise<number> => {
    const key = `user:${userId}:credits`;
    const balanceStr = await redisClient.get(key);

    if (balanceStr) {
      return parseInt(balanceStr);
    }

    // Cache Miss: Sync from MongoDB
    const user = await User.findById(userId).select("credits");
    const balance = user?.credits || 0;

    // Set with no expiry since this is the source of truth
    await redisClient.set(key, balance);
    return balance;
  },

  /**
   * Caches user plan details for 1 hour to speed up Controller checks.
   */
  getUserContext: async (userId: string) => {
    const key = `user:${userId}:context`;

    // 1. Parallel Fetch: Get Real-time Credits + Cached Plan Metadata
    const [balance, cachedMeta] = await Promise.all([
      creditService.getBalance(userId),
      redisClient.get(key),
    ]);

    if (cachedMeta) {
      return { credits: balance, ...JSON.parse(cachedMeta) };
    }

    // 2. Cache Miss: Fetch from DB (Only happens once per hour/login)
    const user = await User.findById(userId).select(
      "planType subscriptionStatus hasUsedProTrial",
    );

    if (!user) return null;

    const meta = {
      hasUsedProTrial: user.hasUsedProTrial,
      isPro: user.planType === "PRO" || user.subscriptionStatus === "active",
      planType: user.planType,
      subscriptionStatus: user.subscriptionStatus,
    };

    // 3. Cache Metadata (Expire in 1 hour to handle plan upgrades)
    await redisClient.setex(key, 3600, JSON.stringify(meta));

    return { credits: balance, ...meta };
  },

  /**
   * Atomic Check & Deduct (Lua Script Version)
   * Replaces WATCH/MULTI/EXEC with atomic Lua execution.
   * Fixes "watch is not a function" in test environments.
   */
  deductCredits: async (userId: string, amount: number): Promise<boolean> => {
    const key = `user:${userId}:credits`;

    // Lua Script: Atomically checks balance and decrements if sufficient.
    // Returns: [1, newBalance] for success, [0, currentBalance] for failure.
    const script = `
      local current = tonumber(redis.call("GET", KEYS[1]) or 0)
      local cost = tonumber(ARGV[1])
      if current >= cost then
        local remaining = redis.call("DECRBY", KEYS[1], cost)
        return {1, remaining}
      else
        return {0, current}
      end
    `;

    try {
      // Execute Lua Script
      // @ts-ignore - IORedis types for eval results can be tricky
      const result = await redisClient.eval(script, 1, key, amount);
      const [success, redisBalance] = result as [number, number];

      if (success === 0) {
        return false; // Insufficient funds
      }

      // 5. Update Mongo (Source of Truth) AND wait for the "True" Balance
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $inc: { credits: -amount } },
        { new: true },
      );

      // 6. SELF-HEALING: Check for Drift
      const trueBalance = updatedUser ? updatedUser.credits : redisBalance;

      if (redisBalance !== trueBalance) {
        logger.warn(
          `⚠️ Credit Drift Detected! Redis: ${redisBalance}, DB: ${trueBalance}. Self-healing cache...`,
        );
        await redisClient.set(key, trueBalance);
      }

      // 7. Emit the TRUE (DB) balance to the UI
      const roomName = userId.toString();
      socketService.emitToUser(roomName, "credits_updated", {
        credits: trueBalance,
        deducted: amount,
        reason: "usage",
      });

      return true;
    } catch (err) {
      logger.error("❌ Credit Deduction Error:", err);
      // In case of Redis script failure, strictly return false or throw
      // Throwing is safer to ensure the controller handles it as a system error
      throw err;
    }
  },

  /**
   * Add Credits (Top-up)
   */
  addCredits: async (userId: string, amount: number) => {
    const key = `user:${userId}:credits`;

    // Increment Redis
    await redisClient.incrby(key, amount);

    // Sync Mongo
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: amount } },
      { new: true },
    );

    // Emit result
    if (updatedUser) {
      socketService.emitToUser(userId.toString(), "credits_updated", {
        credits: updatedUser.credits,
      });
    }
  },

  /**
   * Reset Monthly (Subscription Renewal)
   * Sets balance exactly to 'cap' (e.g., 1000)
   */
  resetMonthlyCredits: async (userId: string, cap: number) => {
    const key = `user:${userId}:credits`;

    await redisClient.set(key, cap);
    await User.findByIdAndUpdate(userId, { credits: cap });

    socketService.emitToUser(userId.toString(), "credits_updated", {
      credits: cap,
    });

    logger.info(`🔄 Reset credits for user ${userId} to ${cap}`);
  },
};
