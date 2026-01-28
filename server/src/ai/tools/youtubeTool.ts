import { DynamicTool } from "@langchain/core/tools";
import { google } from "googleapis";
import { env } from "../../config/env";
import logger from "../../utils/logger";

/**
 * Custom LangChain Tool to search YouTube videos
 */
export const youTubeTool = new DynamicTool({
  name: "youtube_search",
  description: "Searches YouTube for educational videos. Input should be a search query string.",
  func: async (query: string) => {
    try {
      if (!process.env.YOUTUBE_API_KEY) {
        return "YouTube API Key is missing.";
      }

      const youtube = google.youtube({
        version: "v3",
        auth: process.env.YOUTUBE_API_KEY,
      });

      const response = await youtube.search.list({
        part: ["snippet"],
        q: query,
        maxResults: 1, // We only need the top result for the lesson
        type: ["video"],
        relevanceLanguage: "en",
      });

      const video = response.data.items?.[0];

      if (!video || !video.id?.videoId) {
        return "No video found.";
      }

      const videoData = {
        title: video.snippet?.title,
        videoId: video.id.videoId,
        description: video.snippet?.description,
      };

      return JSON.stringify(videoData);
    } catch (error) {
      logger.error("YouTube Tool Error:", error);
      return "Failed to fetch video.";
    }
  },
});