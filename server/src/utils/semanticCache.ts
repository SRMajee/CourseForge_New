import { redisClient } from "../config/redis";
import logger from "./logger";

// 30 Days Cache
const CACHE_TTL = 60 * 60 * 24 * 30;

// 50% Word Overlap required to consider it a "Hit"
// e.g. "React for Beginners" (3 words) vs "React Course" (2 words) -> "React" overlaps
const SIMILARITY_THRESHOLD = 0.96;

export class SemanticCache {
  /**
   * 1. LOCAL TOKENIZER (Free, No API)
   * Breaks text into a Set of unique lowercase words (tokens).
   */
  private tokenize(text: string): Set<string> {
    const tokens = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "") // Remove punctuation
      .split(/\s+/) // Split by spaces
      .filter((w) => w.length > 2); // Ignore small words like 'is', 'to'
    return new Set(tokens);
  }

  /**
   * 2. JACCARD SIMILARITY (The "Free Embedding" Logic)
   * Calculates intersection over union between two sets of words.
   * 1.0 = Identical | 0.0 = No shared words
   */
  private calculateSimilarity(textA: string, textB: string): number {
    const setA = this.tokenize(textA);
    const setB = this.tokenize(textB);

    if (setA.size === 0 || setB.size === 0) return 0;

    // Intersection
    let intersection = 0;
    setA.forEach((token) => {
      if (setB.has(token)) intersection++;
    });

    // Union
    const union = setA.size + setB.size - intersection;

    return intersection / union;
  }

  // --- GET CACHED OUTLINE ---
  async getCachedOutline(topic: string): Promise<any | null> {
    try {
      // 1. Get list of all cached topics
      const keys = await redisClient.smembers("course_index");
      let bestMatch = { key: "", score: -1 };

      // 2. Scan and Compare Strings locally
      for (const key of keys) {
        // Retrieve the original topic string stored in meta
        const metaStr = await redisClient.get(`meta:${key}`);
        if (!metaStr) continue;

        const meta = JSON.parse(metaStr);
        // Compare new topic vs cached topic
        const score = this.calculateSimilarity(topic, meta.topic);

        if (score > bestMatch.score) {
          bestMatch = { key, score };
        }
      }

      // 3. Match Found?
      if (bestMatch.score >= SIMILARITY_THRESHOLD) {
        logger.info(
          `✅ [Local Cache HIT] "${topic}" ~= "${bestMatch.key}" (Score: ${(bestMatch.score * 100).toFixed(0)}%)`,
        );
        const dataStr = await redisClient.get(`data:${bestMatch.key}`);
        return dataStr ? JSON.parse(dataStr) : null;
      }

      return null;
    } catch (error) {
      logger.error("❌ [Cache Read Error]", error);
      return null;
    }
  }

  // --- SET CACHED OUTLINE ---
  async setCachedOutline(topic: string, data: any) {
    try {
      const key = topic
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "_");

      // Store Data
      await redisClient.setex(`data:${key}`, CACHE_TTL, JSON.stringify(data));

      // Store Metadata (Just the topic name now, no vector needed)
      await redisClient.setex(
        `meta:${key}`,
        CACHE_TTL,
        JSON.stringify({ topic }), // 👈 Storing plain text is enough for Jaccard
      );

      // Add to Index
      await redisClient.sadd("course_index", key);

      logger.info(`💾 [Local Cache Saved] Indexed: "${topic}"`);
    } catch (error) {
      logger.error("❌ [Cache Write Error]", error);
    }
  }

  // --- LESSON CACHE (Unchanged) ---
  async getCachedLesson(
    courseTitle: string,
    lessonTitle: string,
  ): Promise<any | null> {
    const key = `lesson_v1:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    const cachedData = await redisClient.get(key);
    if (cachedData) return JSON.parse(cachedData);
    return null;
  }

  async setCachedLesson(courseTitle: string, lessonTitle: string, data: any) {
    const key = `lesson_v1:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    await redisClient.setex(key, CACHE_TTL, JSON.stringify(data));
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, "_");
  }
}

export const semanticCache = new SemanticCache();
