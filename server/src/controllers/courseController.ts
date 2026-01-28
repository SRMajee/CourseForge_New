import { Request, Response } from "express";
import { courseService } from "../services/courseService";
import { lessonService } from "../services/lessonService";
import { clarificationService } from "../services/ClarificationService"; // 👈 Phase 8
import logger from "../utils/logger";
import { courseQueue } from "../queues/courseQueue";
import { redisClient } from "../config/redis"; // 👈 Phase 8

/**
 * POST /api/v1/courses/outline
 * NOW ASYNCHRONOUS via Redis
 * Updated for Phase 8: Ambiguity Check
 */
// ... imports

export const generateCourseOutline = async (req: Request, res: Response) => {
  try {
    const { topic, skipClarification, userAnswers } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId || !topic) {
      return res.status(400).json({ message: "Invalid Request" });
    }

    await courseService.validateBalance(userId, 5);

    // ---------------------------------------------------------
    // 🚦 PHASE 8: Synchronous Ambiguity Check
    // ---------------------------------------------------------
    if (!skipClarification) {
      logger.info(`🤔 Checking ambiguity for: "${topic}"`);

      const analysis = await clarificationService.analyzeTopic(topic);

      // ✅ FIX: Only trigger 422 if we have valid questions
      if (analysis.isAmbiguous && analysis.questions?.length > 0) {
        logger.info(`⏸️ Ambiguity detected. Asking user for specifics.`);

        const jobId = `job:${userId}:${Date.now()}`;
        await redisClient.setex(
          jobId,
          3600,
          JSON.stringify({ userId, topic, timestamp: Date.now() }),
        );

        return res.status(422).json({
          code: "CLARIFICATION_NEEDED",
          message: "Please clarify your request",
          data: {
            jobId,
            reason: analysis.reason,
            questions: analysis.questions,
          },
        });
      }
    }

    // ---------------------------------------------------------
    // ✅ QUEUE THE JOB (Auto-Resolve / Resume)
    // ---------------------------------------------------------
    const job = await courseQueue.add("generate_outline", {
      userId,
      topic,
      action: "generate_outline",
      userAnswers: userAnswers || null,
      skipClarification: true,
    });

    const waitingCount = await courseQueue.getWaitingCount();

    return res.status(202).json({
      message: "Course generation started",
      jobId: job.id,
      status: "queued",
      queuePosition: waitingCount + 1,
    });
  } catch (error: any) {
    // ... error handling
    logger.error("Controller Error:", error);
    return res.status(500).json({ message: "Failed to queue job" });
  }
};

// ... rest of controller

/**
 * POST /api/v1/courses/resume
 * Phase 8: Resume Endpoint (Called by Frontend Form)
 */
export const resumeCourse = async (req: Request, res: Response) => {
  try {
    const { jobId, answers } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!jobId || !answers) {
      return res.status(400).json({ message: "Missing Resume Data" });
    }

    // 1. Validate State from Redis
    const stateRaw = await redisClient.get(jobId);
    if (!stateRaw) {
      return res
        .status(404)
        .json({ message: "Session expired. Please start over." });
    }

    const state = JSON.parse(stateRaw);
    if (state.userId !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // 2. Clean up old state
    await redisClient.del(jobId);

    // 3. Re-Queue the Job (With Answers + Skip Flag)
    // We strictly use the original topic from state to prevent tampering
    const job = await courseQueue.add("generate_outline", {
      userId,
      topic: state.topic,
      action: "generate_outline",
      userAnswers: answers,
      skipClarification: true, // Important: Don't check again
    });

    logger.info(`🚀 Resumed Job Queued: ${job.id}`);

    return res.status(200).json({
      message: "Course generation resumed",
      jobId: job.id,
    });
  } catch (error) {
    logger.error("Resume Error:", error);
    return res.status(500).json({ message: "Failed to resume course" });
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

export const getAllCourses = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?._id;

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
