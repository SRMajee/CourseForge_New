import { Request, Response } from "express";
import { courseService } from "../services/courseService";
import { lessonService } from "../services/lessonService";
import { clarificationService } from "../services/ClarificationService"; // 👈 Phase 8
import logger from "../utils/logger";
import { courseQueue } from "../queues/courseQueue";
import { redisClient } from "../config/redis"; // 👈 Phase 8
import { env } from "../config/env";
import { socketService } from "../services/socketService";
import { User } from "../models/User";

/**
 * POST /api/v1/courses/outline
 * NOW ASYNCHRONOUS via Redis
 * Updated for Phase 8: Ambiguity Check
 */
export const generateCourseOutline = async (req: Request, res: Response) => {
  const COST = env.COST_CREATE_COURSE || 50;
  try {
    const { topic, skipClarification, userAnswers } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId || !topic) {
      return res.status(400).json({ message: "Invalid Request" });
    }

    await courseService.validateBalance(userId, COST);
    const user = await User.findById(userId).select(
      "planType subscriptionStatus",
    );
    const isPro =
      user?.planType === "PRO" || user?.subscriptionStatus === "active";
    // ---------------------------------------------------------
    // 🚦 PHASE 8: Synchronous Ambiguity Check (PRO EXCLUSIVE)
    // ---------------------------------------------------------
    // Only run clarification if User is PRO.
    // Free users skip this and go straight to generation (General Mode).
    if (isPro && !skipClarification) {
      logger.info(`🤔 Checking ambiguity for: "${topic}" (User is PRO)`);
      const analysis = await clarificationService.analyzeTopic(topic);
      if (analysis.isAmbiguous && analysis.questions?.length > 0) {
        const jobId = `job:${userId}:${Date.now()}`;
        await redisClient.setex(
          jobId,
          3600,
          JSON.stringify({ userId, topic, timestamp: Date.now() }),
        );
        return res.status(422).json({
          code: "CLARIFICATION_NEEDED",
          message: "Clarification Needed",
          data: { jobId, questions: analysis.questions },
        });
      }
    }

    const job = await courseQueue.add("generate_outline", {
      userId,
      topic,
      action: "generate_outline",
      userAnswers: userAnswers || null,
      skipClarification: true,
    });

    return res.status(202).json({
      message: "Course generation started",
      jobId: job.id,
      status: "queued",
    });
  } catch (error: any) {
    logger.error("Controller Error:", error);
    return res.status(500).json({ message: "Failed to queue job" });
  }
};

/**
 * ✅ FIXED RESUME CONTROLLER (Robust Input & Idempotency)
 */
export const resumeCourse = async (req: Request, res: Response) => {
  try {
    const { jobId, answers } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    logger.info(`🔄 [Resume] Request for Job ${jobId}`);

    if (!jobId) {
      return res.status(400).json({ message: "Missing Job ID" });
    }

    // 1. Validate State (Idempotency Fix)
    const stateRaw = await redisClient.get(jobId);

    // 🛑 FIX: If key missing, assume duplicate request (success).
    if (!stateRaw) {
      logger.warn(`⚠️ [Resume] Key missing for ${jobId}. Assuming duplicate.`);
      socketService.emitToUser(userId, "resume_processed", { success: true });
      return res
        .status(200)
        .json({ message: "Already Resumed", success: true });
    }

    const state = JSON.parse(stateRaw);
    if (state.userId !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await redisClient.expire(jobId, 5); // Short expire to prevent reuse

    // 2. Robust Answer Parsing (Fixes "Missing Answers")
    // Ensures {0: "A", 1: "B"} or ["A", "B"] both map to {q1: "A", q2: "B"}
    let processedAnswers: Record<string, any> = {};

    if (Array.isArray(answers)) {
      answers.forEach((val, idx) => {
        processedAnswers[`q${idx + 1}`] = val;
      });
    } else if (typeof answers === "object" && answers !== null) {
      Object.keys(answers).forEach((key, idx) => {
        // If key is "q1", keep it. If "0", map to "q1".
        const newKey = key.startsWith("q") ? key : `q${idx + 1}`;
        processedAnswers[newKey] = answers[key];
      });
    }

    logger.info(
      `✅ [Resume] Normalized Answers: ${JSON.stringify(processedAnswers)}`,
    );

    // 3. Queue Job
    const job = await courseQueue.add("generate_outline", {
      userId,
      topic: state.topic,
      action: "generate_outline",
      userAnswers: processedAnswers,
      skipClarification: true,
    });

    logger.info(`🚀 [Resume] Job Queued: ${job.id}`);

    // 4. ACKNOWLEDGE via Socket (Unsticks UI)
    socketService.emitToUser(userId, "resume_processed", { success: true });
    socketService.emitToUser(userId, "job_progress", {
      jobId: job.id,
      status: "resumed",
      message: "Clarification received. AI is thinking...",
      progress: 5,
    });

    return res.status(200).json({ message: "Resumed", jobId: job.id });
  } catch (error) {
    logger.error("❌ [Resume] Error:", error);
    return res.status(500).json({ message: "Failed to resume course" });
  }
};
/**
 * POST /api/v1/courses/lessons/:lessonId/pdf
 * Handles credit deduction for PDF download
 */
export const downloadLessonPDF = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Deduct Credits via Service
    const result = await lessonService.deductPDFCredits(userId);

    return res.status(200).json({
      success: true,
      message: "Credits deducted",
      remainingCredits: result.remainingCredits,
    });
  } catch (error: any) {
    logger.error("Controller Error - PDF Deduct:", error);

    if (error.message.includes("Insufficient credits")) {
      return res
        .status(402)
        .json({ message: "Insufficient credits to download PDF." });
    }

    return res.status(500).json({ message: "Failed to process download." });
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
// ✅ UPDATED: Extracts page/limit for pagination
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 9;

    const result = await courseService.getUserCourses(userId, page, limit);
    res.json(result);
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
