import axios from "axios";
import logger from "../utils/logger";

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
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
    if (!UNSPLASH_ACCESS_KEY) {
      logger.warn("⚠️ No Unsplash Key found. Using fallback image.");
      return this.getRandomFallback();
    }

    try {
      const response = await axios.get(UNSPLASH_URL, {
        params: {
          query,
          per_page: 1,
          orientation: "landscape",
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
        timeout: 3000, // 3s Timeout to prevent hanging generation
      });

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].urls.regular;
      }

      logger.info(`🖼️ No Unsplash results for "${query}". Using fallback.`);
      return this.getRandomFallback();
    } catch (error: any) {
      logger.error(`❌ Unsplash API Error: ${error.message}`);
      return this.getRandomFallback();
    }
  }

  private getRandomFallback(): string {
    return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  }
}

export const imageService = new ImageService();
