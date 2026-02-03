import { redisClient } from "../config/redis";
import { CacheEntry } from "../models/CacheEntry";
import logger from "../utils/logger";

// Redis TTL: 1 Day (Seconds)
const REDIS_TTL = 24 * 60 * 60;

export class SemanticCache {
  // --- OUTLINES ---
  async getCachedOutline(topic: string): Promise<any | null> {
    const normalizedKey = this.normalize(topic);
    return this.hybridGet(normalizedKey, topic, "outline");
  }

  async setCachedOutline(topic: string, data: any) {
    const normalizedKey = this.normalize(topic);
    await this.hybridSet(normalizedKey, topic, data, "outline");
  }

  // --- LESSONS ---
  async getCachedLesson(
    courseTitle: string,
    lessonTitle: string,
  ): Promise<any | null> {
    const key = `lesson:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    // Pass lessonTitle as "topic" for logging/fuzzy matching purposes
    return this.hybridGet(key, lessonTitle, "lesson");
  }

  async setCachedLesson(courseTitle: string, lessonTitle: string, data: any) {
    const key = `lesson:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    await this.hybridSet(key, lessonTitle, data, "lesson");
  }

  // ==========================================
  // ⚙️ INTERNAL HYBRID LOGIC (DRY Principle)
  // ==========================================

  private async hybridGet(
    key: string,
    topic: string,
    type: "outline" | "lesson",
  ): Promise<any | null> {
    try {
      // 1. Check Redis (Fast Signal)
      const isHot = await redisClient.get(key);

      if (isHot) {
        // 🔥 Hot Key: It SHOULD be in Mongo. Fetch directly by Key.
        const entry = await CacheEntry.findOne({ key });
        if (entry) {
          logger.info(`⚡ [Redis+Mongo Hit] Serving "${topic}"`);
          return entry.data;
        }
      }

      // 2. Cold Start / Redis Expired: Search Mongo
      logger.info(`🐢 [Redis Miss] Searching Mongo for "${topic}"...`);

      let entry = await CacheEntry.findOne({ key });

      // If exact match missing (only for outlines), try fuzzy text search
      if (!entry && type === "outline") {
        const results = await CacheEntry.find(
          { $text: { $search: topic }, type: "outline" },
          { score: { $meta: "textScore" } },
        )
          .sort({ score: { $meta: "textScore" } })
          .limit(1);

        if (results.length > 0) {
          entry = results[0];
          logger.info(`✅ [Mongo Fuzzy Hit] Found similar: "${entry.topic}"`);
        }
      }

      // 3. If Found in Mongo -> Re-populate Redis (Make it Hot)
      if (entry) {
        await redisClient.setex(entry.key, REDIS_TTL, "1"); // Store flag, not data
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
    type: "outline" | "lesson",
  ) {
    try {
      // 1. Save to MongoDB (Long Term: 90 Days)
      await CacheEntry.findOneAndUpdate(
        { key },
        {
          key,
          topic,
          data,
          type,
          createdAt: new Date(), // Reset TTL to 90 days from now
        },
        { upsert: true, new: true },
      );

      // 2. Save Key to Redis (Short Term: 1 Day)
      // We only store "1" to save RAM. The data is in Mongo.
      await redisClient.setex(key, REDIS_TTL, "1");

      logger.info(`💾 [Hybrid Cache Saved] "${topic}" (Redis: 1d, Mongo: 90d)`);
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
