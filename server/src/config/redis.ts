import IORedis, { RedisOptions } from "ioredis";
import { env } from "./env";

const redisUrl = env.REDIS_URL || "redis://localhost:6379";

const getRedisConfig = (): RedisOptions => {
  const isTls = redisUrl.startsWith("rediss://");

  const config: RedisOptions = {
    maxRetriesPerRequest: null, // Required by BullMQ
    tls: isTls
      ? {
          rejectUnauthorized: false, // Often needed for serverless Redis providers
        }
      : undefined,
  };
  return config;
};

// 1. Connection for the Queue (BullMQ needs this)
export const redisConnection = new IORedis(redisUrl, getRedisConfig());

// 2. Connection for Caching/General use
export const redisClient = new IORedis(redisUrl, getRedisConfig());

redisConnection.on("error", (err) =>
  console.error("Redis Connection Error:", err),
);
console.log(
  `🔥 Redis Connected (${redisUrl.startsWith("rediss://") ? "Secure" : "Insecure"})`,
);
