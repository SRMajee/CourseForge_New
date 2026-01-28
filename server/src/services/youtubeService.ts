import { google } from 'googleapis';
import { env } from '../config/env';
import logger from '../utils/logger';

export class YouTubeService {
  private youtube;

  constructor() {
    this.youtube = google.youtube({
      version: 'v3',
      auth: env.YOUTUBE_API_KEY // Ensure this is set in your .env
    });
  }

  /**
   * Searches for a single relevant educational video
   */
  async searchVideo(query: string) {
    try {
      if (!query) return null;

      logger.info(`Searching YouTube for: ${query}`);

      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults: 2,      // We only need the top result
        type: ['video'],
        videoEmbeddable: 'true', // Critical: Filters out non-embeddable videos
        relevanceLanguage: 'en',
        safeSearch: 'moderate'
      });

      const item = response.data.items?.[0];

      if (!item || !item.id?.videoId) {
        return null;
      }

      return {
        videoId: item.id.videoId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.high?.url,
        channel: item.snippet?.channelTitle
      };

    } catch (error) {
      logger.error("YouTube API Error:", error);
      // Return null so the frontend can render a fallback or hide the video block
      return null;
    }
  }
}

export const youtubeService = new YouTubeService();