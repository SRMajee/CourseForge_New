import mongoose from "mongoose"; // 👈 Import mongoose for transactions
import { ILesson, Lesson } from "../models/Lesson";
import { Module } from "../models/Module";
import { Course } from "../models/Course";
import { User } from "../models/User"; // 👈 Import User model
import logger from "../utils/logger";
import {
  LanguageKey,
  languageService,
  SUPPORTED_LANGUAGES,
} from "./languageService";
import { CREDIT_COSTS } from "../config/credits"; // 👈 Import Config
import { modelGateway, TaskTier } from "../ai/services/ModelGateway";
import { lessonResponseSchema } from "../ai/parsers/courseSchema";
import { semanticCache } from "../utils/semanticCache";
import { youtubeService } from "./youtubeService";
import { retryWithBackoff } from "../utils/retryHelper";
import { codeExecutionService } from "./CodeExecutionService";
import { creditService } from "./creditService";
import { socketService } from "./socketService";
import { getVectorStore } from "./vectorStore";
import { redisClient } from "../config/redis";
import { PROMPTS } from "../ai/prompts/prompts";
import { lessonGraph } from "../ai/graphs/lessonGraph";
export class LessonService {
  /**
   * ✅ VALIDATION HELPER
   */
  async validateBalance(userId: string, cost: number): Promise<void> {
    let balance = await creditService.getBalance(userId);
    if (balance < cost) {
      const user = await User.findById(userId).select("credits");
      const dbBalance = user?.credits || 0;

      if (dbBalance >= cost) {
        // Drift detected! Heal the cache.
        logger.warn(
          `⚠️ Credit Cache Drift Detected: Redis(${balance}) < DB(${dbBalance}). Syncing...`,
        );
        await redisClient.set(`user:${userId}:credits`, dbBalance);
        balance = dbBalance; // Update local var to allow progression
      } else {
        // Truly insufficient
        throw new Error(
          `Insufficient credits. Required: ${cost}, Available: ${balance}`,
        );
      }
    }
  }
  // ✅ NEW: Handle PDF Credit Deduction
  async deductPDFCredits(userId: string) {
    const COST = CREDIT_COSTS.EXPORT_PDF; // Cost for PDF Download

    // 1. Check & Deduct Atomically
    const success = await creditService.deductCredits(userId, COST);

    if (!success) {
      throw new Error(`Insufficient credits. Required: ${COST}`);
    }

    logger.info(
      `💰 Deducted ${COST} credits for PDF Download (User: ${userId})`,
    );
    const remainingCredits = await creditService.getBalance(userId);
    return { success: true, remainingCredits };
  }
  async deductModulePDFCredits(userId: string) {
    const COST = CREDIT_COSTS.EXPORT_MODULE_PDF; // Cost for PDF Download

    // 1. Check & Deduct Atomically
    const success = await creditService.deductCredits(userId, COST);

    if (!success) {
      throw new Error(`Insufficient credits. Required: ${COST}`);
    }

    logger.info(
      `💰 Deducted ${COST} credits for PDF Download (User: ${userId})`,
    );
    const remainingCredits = await creditService.getBalance(userId);
    return { success: true, remainingCredits };
  }
  async deductCoursePDFCredits(userId: string) {
    const COST = CREDIT_COSTS.EXPORT_COURSE_PDF; // Cost for PDF Download

    // 1. Check & Deduct Atomically
    const success = await creditService.deductCredits(userId, COST);

    if (!success) {
      throw new Error(`Insufficient credits. Required: ${COST}`);
    }

    logger.info(
      `💰 Deducted ${COST} credits for PDF Download (User: ${userId})`,
    );
    const remainingCredits = await creditService.getBalance(userId);
    return { success: true, remainingCredits };
  }
  /**
   * ✅ GENERATION LOGIC (Prompt + AI + DB + Credits)
   * Moved the "Smart Prompt" inside here to keep Controller clean.
   */

  async generateContent(lessonId: string, userId: string) {
    const COST = CREDIT_COSTS.GENERATE_LESSON;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    // 1. Idempotency Check
    if (lesson.isEnriched && lesson.content.length > 0) {
      return lesson;
    }

    // 2. Pre-flight Credit Check
    await this.validateBalance(userId, COST);

    // 3. Build Context
    const module = await Module.findById(lesson.module);
    const course = module ? await Course.findById(module.course) : null;
    const courseTitle = course?.title || "General Topic";
    const moduleTitle = module?.title || "General Module";

    logger.info(`Processing lesson: ${lesson.title}`);

    // 4. Check Cache (Keep caching in Service layer)
    let structuredLesson = await semanticCache.getCachedLesson(
      courseTitle,
      lesson.title,
    );

    if (structuredLesson) {
      logger.info(`⚡ [Cache Hit] Serving cached content for: ${lesson.title}`);
    } else {
      logger.info(`🐢 [Cache Miss] Generating via Graph...`);

      // ✅ GRAPH INVOCATION
      // Replaces manual RAG, AI generation, YouTube search, and Code Verification
      const graphResult = await lessonGraph.invoke({
        topic: lesson.title,
        courseTitle: courseTitle,
        moduleTitle: moduleTitle,
        ragContext: "", // Graph's 'retrieve_context' node will fill this
        objectives: [],
        content: [],
        codeErrors: [],
        iterations: 0,
      });

      structuredLesson = {
        content: graphResult.content,
        objectives: graphResult.objectives,
        title: lesson.title,
      };

      // Save to Cache
      semanticCache
        .setCachedLesson(courseTitle, lesson.title, structuredLesson)
        .catch((e) => logger.error("Failed to cache lesson:", e));
    }

    // 5. Save & Deduct
    const isDeducted = await creditService.deductCredits(userId, COST);
    if (!isDeducted) throw new Error("Insufficient credits");

    try {
      lesson.content = structuredLesson.content;
      lesson.objectives = structuredLesson.objectives;
      lesson.isEnriched = true;

      await lesson.save();

      logger.info(`✅ Lesson generated & saved. Credits deducted: ${COST}`);
      return lesson;
    } catch (saveError) {
      // 🚨 Refund logic
      logger.error(
        "❌ Save failed after deduction. Refunding user...",
        saveError,
      );
      await creditService.addCredits(userId, COST);
      throw new Error("Failed to save lesson. Credits have been refunded.");
    }
  }

  async getLessonById(lessonId: string) {
    const lesson = await Lesson.findById(lessonId);
    return lesson;
  }

  /**
   * Generates audio with Credit Deduction Transaction
   * @param lessonId
   * @param userId - Required for credit deduction
   * @param language
   * ✅ OPTIMIZED AUDIO GENERATION
   * Pattern: Deduct -> Generate (with Retry) -> Save/Refund
   * Prevents DB locks during slow AI/Cloudinary calls.
   */
  async generateAudio(
    lessonId: string,
    userId: string,
    language: string = "hinglish",
  ) {
    const COST = CREDIT_COSTS.GENERATE_AUDIO;
    const langKey = (
      Object.keys(SUPPORTED_LANGUAGES).includes(language)
        ? language
        : "hinglish"
    ) as LanguageKey;
    const langConfig = SUPPORTED_LANGUAGES[langKey];

    // 1. Check Lesson & Cache (Read-Only)
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    // ✅ FIX: Standard Object Access (No .get needed)
    const existingUrl = lesson.audioUrls?.[langKey];

    if (existingUrl) {
      return {
        audioUrl: existingUrl,
        language: langConfig.label,
        isCached: true,
      };
    }

    // 2. Prepare Text
    const fullText = lesson.content
      .filter((b: any) => b.type === "heading" || b.type === "paragraph")
      .map((b: any) => b.text)
      .join(" ");

    if (!fullText) throw new Error("Lesson content is empty");

    // ---------------------------------------------------------
    // PHASE 1: DEDUCT CREDITS
    // ---------------------------------------------------------
    const isDeducted = await creditService.deductCredits(userId, COST);
    if (!isDeducted) throw new Error("Insufficient credits");
    try {
      logger.info(`💰 Deducted ${COST} credits for Audio`);
    } catch (err) {
      // 🚨 SAFETY NET: If saving fails, REFUND the user immediately
      logger.error("❌ Save failed after deduction. Refunding user...", err);
      await creditService.addCredits(userId, COST);
      throw new Error("Failed to generate audio. Credits have been refunded.");
    }

    // ---------------------------------------------------------
    // PHASE 2: GENERATE (No DB Lock)
    // ---------------------------------------------------------
    let cdnUrl: string;
    let script: string;

    try {
      script = await retryWithBackoff(async () => {
        return await languageService.generateScript(fullText, langKey);
      }, 3);

      const audioBuffer = await languageService.generateAudio(
        script,
        langConfig.ttsCode,
      );

      cdnUrl = await languageService.uploadAudioToCloudinary(
        audioBuffer,
        `courseforge/lessons/${langKey}`,
      );
    } catch (apiError) {
      logger.error("❌ Audio Gen Failed. Refunding user...", apiError);

      const refundSession = await mongoose.startSession();
      refundSession.startTransaction();
      try {
        const user = await User.findById(userId).session(refundSession);
        if (user) {
          user.credits += COST;
          await user.save({ session: refundSession });
        }
        await refundSession.commitTransaction();
        logger.info(`↩️ Refunded ${COST} credits to user ${userId}`);
      } finally {
        refundSession.endSession();
      }

      throw new Error("Audio generation failed. Credits have been refunded.");
    }

    // ---------------------------------------------------------
    // PHASE 3: SAVE RESULT (Standard Object Logic)
    // ---------------------------------------------------------
    const saveSession = await mongoose.startSession();
    saveSession.startTransaction();
    try {
      const freshLesson = await Lesson.findById(lessonId).session(saveSession);
      if (freshLesson) {
        // ✅ FIX: Use Spread Syntax (Supported now that it's a Record)
        const currentUrls = freshLesson.audioUrls || {};

        freshLesson.audioUrls = {
          ...currentUrls,
          [langKey]: cdnUrl,
        };

        // ⚠️ CRITICAL: When using Mixed/Object types, you MUST markModified
        freshLesson.markModified("audioUrls");

        await freshLesson.save({ session: saveSession });
      }
      await saveSession.commitTransaction();
    } catch (saveError) {
      await saveSession.abortTransaction();
      logger.error("❌ Failed to save Audio URL to DB:", saveError);
    } finally {
      saveSession.endSession();
    }

    // Success!
    const finalUser = await User.findById(userId).select("credits");
    return {
      audioUrl: cdnUrl,
      script: script,
      language: langConfig.label,
      isCached: false,
      creditsDeducted: COST,
      remainingCredits: finalUser?.credits || 0,
    };
  } // ✅ NEW: Save user's edited code
  async updateCodeBlock(
    lessonId: string,
    userId: string,
    blockIndex: number,
    newCode: string,
    newOutput?: string,
  ) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    if (!lesson.content || !lesson.content[blockIndex]) {
      throw new Error("Invalid block index");
    }

    // ✅ NEW: Prepare update object for both Code AND Output
    const updatePathCode = `content.${blockIndex}.code`;
    const updatePathOutput = `content.${blockIndex}.output`;

    const updateData: any = {
      [updatePathCode]: newCode,
    };

    // Only save output if it exists (so we don't overwrite with null if not intended)
    if (newOutput !== undefined) {
      updateData[updatePathOutput] = newOutput;
    }

    await Lesson.updateOne({ _id: lessonId }, { $set: updateData });

    return { success: true };
  }
  async updateLessonContent(
    lessonId: string,
    data: { content: ILesson["content"]; objectives?: string[] },
  ) {
    return await Lesson.findByIdAndUpdate(
      lessonId,
      {
        content: data.content,
        objectives: data.objectives || [], // Save the objectives too
        isEnriched: true,
      },
      { new: true }, // Return the updated doc
    );
  }
}

export const lessonService = new LessonService();
