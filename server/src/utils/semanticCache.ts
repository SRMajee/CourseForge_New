import { redisClient } from "../config/redis";
import { GoogleGenerativeAI } from "@google/generative-ai"; // ✅ Switch to direct SDK
import { env } from "../config/env";
import logger from "./logger";

const CACHE_TTL = 60 * 60 * 24 * 30; // 30 Days
const SIMILARITY_THRESHOLD = 0.9; // 92% similarity required to be considered a "Hit"

export class SemanticCache {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY as string);
    // ✅ FIX: Use 'embedding-001' (Stable) instead of 'text-embedding-004' (Unstable/404)
    this.model = this.genAI.getGenerativeModel({ model: "embedding-001" });
  }

  // --- 1. EMBEDDING GENERATOR (Robust Helper) ---
  private async getEmbedding(text: string): Promise<number[] | null> {
    try {
      // logger.info(`🔍 [Semantic] Generating embedding for: "${text.substring(0, 20)}..."`);
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (error: any) {
      // Log error but don't crash the entire flow
      logger.error(`❌ [Semantic Read Error] ${error.message}`);
      return null;
    }
  }

  // --- MATH HELPER: Cosine Similarity ---
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // --- 2. COURSE OUTLINES (Semantic) ---
  async getCachedOutline(topic: string): Promise<any | null> {
    try {
      const queryEmbedding = await this.getEmbedding(topic);
      if (!queryEmbedding) return null; // Skip if embedding failed

      // 1. Get list of all cached outlines from our index
      const keys = await redisClient.smembers("course_index");

      let bestMatch = { key: "", score: -1 };

      // 2. Linear Scan
      for (const key of keys) {
        // Fetch the metadata (which contains the vector)
        const metaStr = await redisClient.get(`meta:${key}`);
        if (!metaStr) continue;

        const meta = JSON.parse(metaStr);

        // Compare Vectors
        const score = this.cosineSimilarity(queryEmbedding, meta.embedding);

        if (score > bestMatch.score) {
          bestMatch = { key, score };
        }
      }

      // 3. Did we find a match?
      if (bestMatch.score >= SIMILARITY_THRESHOLD) {
        logger.info(
          `✅ [Semantic HIT] Matched "${topic}" with "${bestMatch.key}" (Score: ${(bestMatch.score * 100).toFixed(1)}%)`,
        );

        const dataStr = await redisClient.get(`data:${bestMatch.key}`);
        return dataStr ? JSON.parse(dataStr) : null;
      }

      logger.info(
        `🐢 [Semantic MISS] Best match was only ${(bestMatch.score * 100).toFixed(1)}%`,
      );
      return null;
    } catch (error) {
      logger.error("❌ [Semantic Read Error]", error);
      return null;
    }
  }

  async setCachedOutline(topic: string, data: any) {
    try {
      // 1. Generate Embedding
      const embedding = await this.getEmbedding(topic);

      // If embedding failed, don't cache (otherwise we pollute cache with bad data)
      if (!embedding) return;

      // 2. Create a clean key
      const key = topic
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, "_");

      // 3. Store Data (The Content)
      await redisClient.setex(`data:${key}`, CACHE_TTL, JSON.stringify(data));

      // 4. Store Metadata (The Vector)
      await redisClient.setex(
        `meta:${key}`,
        CACHE_TTL,
        JSON.stringify({ topic, embedding }),
      );

      // 5. Add to Index (So we know what to scan later)
      await redisClient.sadd("course_index", key);

      logger.info(`💾 [Semantic Saved] Indexed: "${topic}"`);
    } catch (error) {
      logger.error("❌ [Semantic Write Error]", error);
    }
  }

  // --- 3. LESSON CONTENT (Exact Match is safer for lessons) ---
  async getCachedLesson(
    courseTitle: string,
    lessonTitle: string,
  ): Promise<any | null> {
    const key = `lesson_v1:${this.normalize(courseTitle)}:${this.normalize(lessonTitle)}`;
    const cachedData = await redisClient.get(key);

    if (cachedData) {
      logger.info(`⚡ [Lesson Cache HIT] "${lessonTitle}"`);
      return JSON.parse(cachedData);
    }
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
