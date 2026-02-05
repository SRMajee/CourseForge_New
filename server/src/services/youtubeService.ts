import { google } from "googleapis";
import { env } from "../config/env";
import logger from "../utils/logger";

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({
      version: "v3",
      auth: env.YOUTUBE_API_KEY,
    });
  }

  /**
   * Search YouTube for videos matching the query
   * Returns the top result with videoId, title, thumbnail, and channel
   * If no results or error (e.g. quota exceeded), returns null
   * @param query Search query string
   * @return Object | null Video details or null if not found/error
   */
  async searchVideo(query: string) {
    try {
      if (!query) return null;

      // logger.info(`Searching YouTube for: ${query}`);

      const response = await this.youtube.search.list({
        part: ["snippet"],
        q: query,
        maxResults: 2, // We only need the top result
        type: ["video"],
        videoEmbeddable: "true", // Critical: Filters out non-embeddable videos
        relevanceLanguage: "en",
        safeSearch: "moderate",
      });

      const item = response.data.items?.[0];

      if (!item || !item.id?.videoId) {
        return null;
      }

      return {
        videoId: item.id.videoId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.high?.url,
        channel: item.snippet?.channelTitle,
      };
    } catch (error: any) {
      //  Gracefully handle Quota Limits
      if (error.message?.includes("quota") || error.code === 403) {
        logger.warn(
          `⚠️ YouTube API Quota Exceeded. Bypassing video search for: "${query}"`,
        );
      } else {
        logger.error("YouTube API Error:", error.message);
      }
      // Return null so the frontend/service can render a fallback or hide the video block
      return null;
    }
  }
}

export const youtubeService = new YouTubeService();
