import { Request, Response } from "express";
import { courseService } from "../services/courseService";
import { lessonService } from "../services/lessonService";
import logger from "../utils/logger";
import { courseQueue } from "../queues/courseQueue";

/**
 * POST /api/v1/courses/outline
 * NOW ASYNCHRONOUS via Redis
 */
export const generateCourseOutline = async (req: Request, res: Response) => {
  try {
    const { topic } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId || !topic) {
      return res.status(400).json({ message: "Invalid Request" });
    }

    // 1. Validate Balance
    await courseService.validateBalance(userId, 5);

    // 2. Add to Queue
    const job = await courseQueue.add("generate_outline", {
      userId,
      topic,
      action: "generate_outline",
    });

    // 3. Get estimated wait time/position
    const waitingCount = await courseQueue.getWaitingCount();

    logger.info(`Job ${job.id} added to queue for user ${userId}`);

    return res.status(202).json({
      message: "Course generation started",
      jobId: job.id,
      status: "queued",
      queuePosition: waitingCount + 1, // You are at the end of the line
    });
  } catch (error: any) {
    logger.error("Controller Error - Outline:", error);
    if (error.message.includes("Insufficient credits")) {
      return res.status(403).json({ message: error.message });
    }
    return res
      .status(500)
      .json({ message: "Failed to queue course generation." });
  }
};

/**
 * POST /api/v1/courses/lessons/:lessonId/generate
 */
export const generateLessonContent = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // The Controller just delegates.
    // The Service handles the Prompt, The Credit Check, and The Database.
    const updatedLesson = await lessonService.generateContent(lessonId, userId);

    return res.json(updatedLesson);
  } catch (error: any) {
    logger.error("Controller Error - Lesson Gen:", error);

    if (error.message.includes("Insufficient credits")) {
      return res.status(403).json({ message: error.message });
    }
    if (error.message === "Lesson not found") {
      return res.status(404).json({ message: error.message });
    }

    return res
      .status(500)
      .json({ message: "Failed to generate lesson content" });
  }
};
/**
 * GET /api/v1/courses/:id
 */
export const getCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const course = await courseService.getCourseById(id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.json(course);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/v1/courses/lessons/:lessonId/generate
 */

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }
    const courses = await courseService.getUserCourses(userId);
    res.json(courses);
  } catch (error) {
    logger.error("Controller Error - Get All Courses:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
};

/**
 * GET /api/v1/courses/lessons/:lessonId
 */
export const getLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const lesson = await lessonService.getLessonById(lessonId);

    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    return res.json(lesson);
  } catch (error) {
    logger.error("Controller Error - Get Lesson:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    const result = await courseService.deleteCourse(courseId, userId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in deleteCourse:", error.message);

    if (error.message === "Course not found or unauthorized") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to delete course" });
  }
};

// ------------------------------------------------------------------
// 2. Controller: Delete Module
// ------------------------------------------------------------------
export const deleteModule = async (req: Request, res: Response) => {
  try {
    const { moduleId } = req.params;

    const result = await courseService.deleteModule(moduleId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in deleteModule:", error.message);

    if (error.message === "Module not found") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to delete module" });
  }
};

// ------------------------------------------------------------------
// 3. Controller: Delete Lesson
// ------------------------------------------------------------------
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;

    const result = await courseService.deleteLesson(lessonId);

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Error in deleteLesson:", error.message);

    if (error.message === "Lesson not found") {
      return res.status(404).json({ message: error.message });
    }

    res.status(500).json({ message: "Failed to delete lesson" });
  }
};
