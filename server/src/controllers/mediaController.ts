import { Request, Response } from "express";
import { youtubeService } from "../services/youtubeService";
import { languageService } from "../services/languageService";
import logger from "../utils/logger";
import { lessonService } from "../services/lessonService";
export const searchVideo = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ message: "Search query 'q' is required" });
    }

    const videoData = await youtubeService.searchVideo(query);

    // Return null with 200 OK so the frontend handles it gracefully (e.g. hides the video block).
    if (!videoData) {
      return res.json(null);
    }

    return res.json(videoData);
  } catch (error) {
    logger.error("Controller Error - YouTube Search:", error);
    // Return null instead of 500 to keep the UI alive
    return res.json(null);
  }
};

/**
 * POST /api/v1/media/hinglish
 * Body: { text: "Some english content..." }
 * Returns: Audio File (Stream)
 */

export const generateLessonAudio = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const language = req.query.lang as string;
    // @ts-ignore
    const userId = req.user?._id; // Ensure user is attached via middleware

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Pass userId here 👇
    const result = await lessonService.generateAudio(
      lessonId,
      userId,
      language,
    );

    res.json(result);
  } catch (error: any) {
    // Handle specific "Insufficient credits" message cleaner
    if (error.message.includes("Insufficient credits")) {
      return res.status(402).json({ message: error.message });
    }
    if (error.message === "Lesson not found") {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};