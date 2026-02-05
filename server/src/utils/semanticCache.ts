import { redisClient } from "../config/redis";
import { CacheEntry } from "../models/CacheEntry";
import logger from "../utils/logger";

//  Redis TTL = 1 Hour (3600 seconds)
const REDIS_TTL = 60 * 60;

export class SemanticCache {
  // --- OUTLINES ---
  async getCachedOutline(topic: string): Promise<any | null> {
    const normalizedKey = this.normalize(topic);
    return this.hybridGet(normalizedKey, topic, "course");
  }

  async setCachedOutline(topic: string, data: any) {
    const normalizedKey = this.normalize(topic);
    await this.hybridSet(normalizedKey, topic, data, "course");
  }

  // --- LESSONS ---
  async getCachedLesson(
    courseTitle: string,
    lessonTitle: string,
  ): Promise<any | null> {
    const key = `lesson:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    return this.hybridGet(key, lessonTitle, "lesson");
  }

  async setCachedLesson(courseTitle: string, lessonTitle: string, data: any) {
    const key = `lesson:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    await this.hybridSet(key, lessonTitle, data, "lesson");
  }

  // ==========================================
  // ⚙️ INTERNAL HYBRID LOGIC (OPTIMIZED)
  // ==========================================

  private async hybridGet(
    key: string,
    topic: string,
    type: "course" | "lesson",
  ): Promise<any | null> {
    try {
      // 1. Check Redis (Fastest: ~2ms)
      const cachedString = await redisClient.get(key);

      if (cachedString) {
        // HIT: Parse and return immediately. NO Mongo call.
        logger.info(`⚡ [Redis Hit] Serving "${topic}" from RAM`);
        return JSON.parse(cachedString);
      }

      // 2. Cold Start / Redis Expired: Search Mongo (Slower: ~50ms)
      logger.info(`🐢 [Redis Miss] Searching Mongo for "${topic}"...`);

      const entry = await CacheEntry.findOne({ key, type });

      // 3. If Found in Mongo -> Re-populate Redis (Make it Hot)
      if (entry) {
        logger.info(`🔄 [Cache Hydration] Loading "${topic}" into Redis`);

        // Store FULL data in Redis for 1 Hour
        await redisClient.setex(key, REDIS_TTL, JSON.stringify(entry.data));

        return entry.data;
      }

      return null;
    } catch (error) {
      logger.error(`❌ [Cache Read Error]`, error);
      return null;
    }
  }

  private async hybridSet(
    key: string,
    topic: string,
    data: any,
    type: "course" | "lesson",
  ) {
    try {
      // 1. Save to MongoDB (Long Term: 90 Days Persistence)
      await CacheEntry.findOneAndUpdate(
        { key },
        {
          key,
          topic, // Useful for debugging manually in Mongo
          data,
          type,
          createdAt: new Date(), // Reset Mongo TTL
        },
        { upsert: true, new: true },
      );

      // 2. Save to Redis (Short Term: 1 Hour Acceleration)
      await redisClient.setex(key, REDIS_TTL, JSON.stringify(data));

      logger.info(
        `💾 [Hybrid Cache Saved] "${topic}" (Redis: 1hr, Mongo: 90d)`,
      );
    } catch (error) {
      logger.error(`❌ [Cache Write Error]`, error);
    }
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "_");
  }
}

export const semanticCache = new SemanticCache();
