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

    // Set with no expiry (or long expiry) since this is the source of truth
    await redisClient.set(key, balance);
    return balance;
  },

  /**
   * Atomic Check & Deduct (The "Credit Lock")
   * Returns TRUE if successful, FALSE if insufficient funds.
   */
  deductCredits: async (userId: string, amount: number): Promise<boolean> => {
    const key = `user:${userId}:credits`;

    // 1. WATCH the key to ensure no one else modifies it while we read
    await redisClient.watch(key);

    // 2. Get current balance
    let balance = await creditService.getBalance(userId);

    // 3. Check Funds
    if (balance < amount) {
      await redisClient.unwatch(); // Release lock
      return false;
    }

    // 4. Atomic Transaction (MULTI/EXEC)
    const multi = redisClient.multi();
    multi.decrby(key, amount); // Redis Update

    const results = await multi.exec();

    // If results is null, it means the key changed during WATCH (Race Condition)
    if (!results) {
      throw new Error("Race condition detected. Please retry.");
    }

    const [err, redisNewBalance] = results[0];

    if (err) {
      logger.error("❌ Redis DECR Error:", err);
      return false;
    }

    // 5. ✅ CRITICAL FIX: Update Mongo AND wait for the "True" Balance
    // We use { new: true } to get the document AFTER the deduction
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: -amount } },
      { new: true },
    );

    // 6. ✅ SELF-HEALING: Check for Drift
    // If Redis says one thing (e.g., 270) but DB says another (e.g., 90),
    // we MUST trust the DB and fix Redis immediately.
    const trueBalance = updatedUser
      ? updatedUser.credits
      : Number(redisNewBalance);

    if (Number(redisNewBalance) !== trueBalance) {
      logger.warn(
        `⚠️ Credit Drift Detected! Redis: ${redisNewBalance}, DB: ${trueBalance}. Self-healing cache...`,
      );
      // Force Redis to match DB
      await redisClient.set(key, trueBalance);
    }

    // 7. Emit the TRUE (DB) balance to the UI
    const roomName = userId.toString();
    logger.info(
      `📡 Broadcasting deduction to ${roomName}. New Balance: ${trueBalance}`,
    );

    socketService.emitToUser(roomName, "credits_updated", {
      credits: trueBalance, // 👈 Now sending the correct 90 (or 105-15)
      deducted: amount,
      reason: "usage",
    });

    return true;
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
