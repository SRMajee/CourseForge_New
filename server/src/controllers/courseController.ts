import { Request, Response } from "express";
import { CourseService, courseService } from "../services/courseService";
import { LessonService, lessonService } from "../services/lessonService";
import { clarificationService } from "../services/ClarificationService";
import logger from "../utils/logger";
import { courseQueue } from "../queues/courseQueue";
import { redisClient } from "../config/redis";
import { env } from "../config/env";
import { socketService } from "../services/socketService";
import { User } from "../models/User";
import { codeExecutionService } from "../services/CodeExecutionService";
import { CREDIT_COSTS } from "../config/credits";
import { Course } from "../models/Course";
import { Module } from "../models/Module";
import { creditService } from "../services/creditService";
/**
 * POST /api/v1/courses/outline
 * NOW ASYNCHRONOUS via Redis
 * Updated for Phase 8: Ambiguity Check
 */
/**
 * POST /api/v1/courses/outline
 * NOW ASYNCHRONOUS via Redis
 * Updated for Phase 1: Pro Mode, Trials & Dynamic Cost
 */
export const generateCourseOutline = async (req: Request, res: Response) => {
  try {
    const { topic, skipClarification, userAnswers, mode } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId || !topic) {
      return res.status(400).json({ message: "Invalid Request" });
    }

    // 1. Fetch User to determine Status & Trial Eligibility
    const user = await creditService.getUserContext(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPro = user.isPro;
    const requestedMode = mode === "pro" ? "pro" : "standard";
    let isTrial = false;
    // 2. Dynamic Cost Calculation (Pre-flight Check)
    let requiredCredits = CREDIT_COSTS.CREATE_COURSE; // Default Standard (50)

    if (requestedMode === "pro") {
      if (isPro) {
        requiredCredits = CREDIT_COSTS.CREATE_COURSE_PRO; // Pro User (100)
      } else {
        // Free User attempting Pro
        if (!user.hasUsedProTrial) {
          requiredCredits = 0; // 🎉 Free Trial (Cost is 0)
          isTrial = true;
        } else {
          // 🛑 Block access if trial already used
          return res.status(403).json({
            message:
              "Pro Mode requires a subscription. You have already used your free trial.",
          });
        }
      }
    }

    // 3. Validate Balance (Fast Fail)
    // We check against 'requiredCredits' which might be 0 for a trial
    try {
      await courseService.validateBalance(userId.toString(), requiredCredits);
    } catch (err: any) {
      logger.warn(
        `Balance validation failed for user ${userId}: ${err.message}`,
      );
      return res.status(402).json({
        message: `Insufficient credits. Required: ${requiredCredits}, Available: ${user.credits}`,
      });
    }
    // if (user.credits < requiredCredits) {
    //   return res.status(402).json({
    //     message: `Insufficient credits. Required: ${requiredCredits}, Available: ${user.credits}`,
    //   });
    // }

    // ---------------------------------------------------------
    // 🚦 PHASE 8: Synchronous Ambiguity Check (PRO EXCLUSIVE)
    // ---------------------------------------------------------
    if ((isTrial || isPro) && !skipClarification && mode === "pro") {
      logger.info(`🤔 Checking ambiguity for: "${topic}" (User is PRO)`);
      const analysis = await clarificationService.analyzeTopic(topic);
      if (analysis.isAmbiguous && analysis.questions?.length > 0) {
        const jobId = `job:${userId}:${Date.now()}`;

        // SAVE MODE TO REDIS (So we don't lose it on resume)
        await redisClient.setex(
          jobId,
          3600,
          JSON.stringify({
            userId,
            topic,
            mode: requestedMode,
            timestamp: Date.now(),
          }),
        );

        return res.status(422).json({
          code: "CLARIFICATION_NEEDED",
          message: "Clarification Needed",
          data: { jobId, questions: analysis.questions },
        });
      }
    }

    // 4. Queue Job (Pass Mode to Worker)
    const job = await courseQueue.add("generate_outline" as any, {
      userId,
      topic,
      action: "generate_outline",
      userAnswers: userAnswers || null,
      skipClarification: true,
      mode: requestedMode,
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
export const regenerateCourseStructure = async (
  req: Request,
  res: Response,
) => {
  try {
    const { courseId } = req.params;
    const { instruction, mode } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const updatedCourse = await courseService.regenerateCourse(
      courseId,
      userId,
      instruction,
      mode,
    );

    return res.json(updatedCourse);
  } catch (error: any) {
    logger.error("Regenerate Course Error:", error);
    if (error.message.includes("Insufficient credits")) {
      return res.status(402).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to regenerate course" });
  }
};
// ✅ NEW: Get Specific Course Version
export const getCourseVersion = async (req: Request, res: Response) => {
  try {
    const { courseId, versionIndex } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const historicalCourse = await courseService.getCourseVersion(
      courseId,
      parseInt(versionIndex),
    );

    return res.json(historicalCourse);
  } catch (error: any) {
    logger.error("Get Course Version Error:", error);
    return res.status(500).json({ message: "Failed to retrieve version" });
  }
};
// ✅ NEW: Get Specific Lesson Version
export const getLessonVersion = async (req: Request, res: Response) => {
  try {
    const { lessonId, versionIndex } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const historicalLesson = await courseService.getLessonVersion(
      lessonId,
      parseInt(versionIndex),
    );

    return res.json(historicalLesson);
  } catch (error: any) {
    // logger.error("Get Lesson Version Error:", error);
    return res.status(500).json({ message: "Failed to retrieve version" });
  }
};
// ✅ NEW: Refine Lesson Content
export const refineLessonContent = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { instruction, mode } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const updatedLesson = await courseService.refineLesson(
      lessonId,
      userId,
      instruction,
      mode,
    );

    return res.json(updatedLesson);
  } catch (error: any) {
    logger.error("Refine Lesson Error:", error);
    if (error.message.includes("Insufficient credits")) {
      return res.status(402).json({ message: error.message });
    }
    return res.status(500).json({ message: "Failed to refine lesson" });
  }
};
/**
 * POST /api/v1/courses/resume
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

    // 1. Validate State
    const stateRaw = await redisClient.get(jobId);

    // FIX: If key missing, assume duplicate request (success).
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
    let processedAnswers: Record<string, any> = {};

    if (Array.isArray(answers)) {
      answers.forEach((val, idx) => {
        processedAnswers[`q${idx + 1}`] = val;
      });
    } else if (typeof answers === "object" && answers !== null) {
      Object.keys(answers).forEach((key, idx) => {
        const newKey = key.startsWith("q") ? key : `q${idx + 1}`;
        processedAnswers[newKey] = answers[key];
      });
    }

    logger.info(
      `✅ [Resume] Normalized Answers: ${JSON.stringify(processedAnswers)}`,
    );

    // 3. Queue Job (Restore Mode from State)
    const job = await courseQueue.add("generate_outline" as any, {
      userId,
      topic: state.topic,
      action: "generate_outline",
      userAnswers: processedAnswers,
      skipClarification: true,
      mode: state.mode || "standard",
    });

    logger.info(
      `🚀 [Resume] Job Queued: ${job.id} | Mode: ${state.mode || "standard"}`,
    );

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

/*
 * ✅ 1. Module PDF Deduction
 */
export const downloadModulePDF = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Deduct Credits via Service
    const result = await lessonService.deductModulePDFCredits(userId);

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

// ✅ 2. Full Course PDF Deduction
export const downloadCoursePDF = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Deduct Credits via Service
    const result = await lessonService.deductCoursePDFCredits(userId);

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
/**
 * PATCH /api/v1/courses/lessons/:lessonId/code
 * ✅ NEW: Save persistent code
 */
export const saveLessonCode = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { blockIndex, code, output } = req.body; // 👈 Get output from body
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Pass output to service
    await lessonService.updateCodeBlock(
      lessonId,
      userId,
      blockIndex,
      code,
      output,
    );

    return res.json({
      success: true,
      message: "Code & Output saved successfully",
    });
  } catch (error: any) {
    logger.error("Save Code Error:", error);
    return res.status(500).json({ message: "Failed to save code" });
  }
};
/**
 * POST /api/v1/courses/execute
 * Executes code via CodeExecutionService
 */
export const executeCode = async (req: Request, res: Response) => {
  try {
    const { language, code } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Call Service
    const result = await codeExecutionService.execute(language, code);

    // Return Result (Service handles success/failure formatting)
    return res.json(result);
  } catch (error: any) {
    logger.error("Controller Execution Error:", error.message);

    // Handle specific errors
    if (error.message.includes("not supported")) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({
      message: "Execution failed",
      error: error.message,
    });
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
