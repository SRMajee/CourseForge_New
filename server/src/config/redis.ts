// src/config/redis.ts
// Create a shared Redis connection config to prevent connection leaks.
import IORedis from "ioredis";
import { env } from "./env"; // Assuming you have this

// 1. Connection for the Queue (BullMQ needs this)
export const redisConnection = new IORedis(
  env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // Required by BullMQ
  },
);

// 2. Connection for Caching/General use
export const redisClient = new IORedis(
  env.REDIS_URL || "redis://localhost:6379",
);

console.log("🔥 Redis Connected");
