import axios from "axios";
import logger from "../utils/logger";
import { env } from "../config/env";

const UNSPLASH_ACCESS_KEY = env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_URL = "https://api.unsplash.com/search/photos";

// Fallback images (Gradients/Abstract) to use if API fails
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5?auto=format&fit=crop&w=800&q=80",
];

export class ImageService {
  /**
   * Fetches a relevant image from Unsplash based on the topic.
   * Returns a fallback image if the API call fails or hits rate limits.
   */
  async getCourseThumbnail(query: string): Promise<string> {
    // 1. Safety Check: If no key is configured, fail fast to fallback
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      logger.warn("⚠️ No Unsplash Key found. Using fallback image.");
      return this.getRandomFallback();
    }

    try {
      const response = await axios.get(UNSPLASH_URL, {
        params: {
          query,
          per_page: 1,
          orientation: "landscape",
          content_filter: "high", // Filter NSFW results
        },
        headers: {
          Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
        timeout: 4000, // 4s Timeout to prevent hanging generation
      });

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].urls.regular;
      }

      logger.info(`🖼️ No Unsplash results for "${query}". Using fallback.`);
      return this.getRandomFallback();
    } catch (error: any) {
      // 2. Error Handling: Log it but DO NOT CRASH. Return fallback.
      logger.error(`❌ Unsplash API Error: ${error.message}`);
      return this.getRandomFallback();
    }
  }

  private getRandomFallback(): string {
    // 3. Robust Fallback: Ensure we always have an array
    if (!FALLBACK_IMAGES || FALLBACK_IMAGES.length === 0) {
      return "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=800&q=80";
    }
    return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  }
}

export const imageService = new ImageService();
