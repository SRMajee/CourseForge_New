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
import { modelGateway, TaskTier } from "./ModelGateway";
import { lessonResponseSchema } from "../ai/parsers/courseSchema";
import { semanticCache } from "../utils/semanticCache";
import { youtubeService } from "./youtubeService";
import { retryWithBackoff } from "../utils/retryHelper";
import { codeExecutionService } from "./CodeExecutionService";
import { creditService } from "./creditService";
import { socketService } from "./socketService";
export class LessonService {
  /**
   * ✅ VALIDATION HELPER
   */
  async validateBalance(userId: string, cost: number) {
    const user = await User.findById(userId);
    if (!user || user.credits < cost) {
      throw new Error(`Insufficient credits. Required: ${cost}`);
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

    // ---------------------------------------------------------
    // ⚡ STEP 4: CHECK SEMANTIC CACHE
    // ---------------------------------------------------------
    let structuredLesson = await semanticCache.getCachedLesson(
      courseTitle,
      lesson.title,
    );

    if (structuredLesson) {
      logger.info(`⚡ [Cache Hit] Serving cached content for: ${lesson.title}`);
    } else {
      logger.info(`🐢 [Cache Miss] Generating fresh content...`);

      // ---------------------------------------------------------
      // 🧠 AI GENERATION (One-Shot with Strict Structure)
      // ---------------------------------------------------------
      const systemPrompt = `
      You are an interactive course creator.
      
      STEP 1: CONTENT PLANNING (_thought)
      In the '_thought' field, outline the lesson flow. 
      - Start with a Hook/Objective.
      - Explain the Concept clearly.
      - Provide a Code Example (if technical).
      - Search for a Video (using 'query').
      - End with a Knowledge Check (MCQ).
      
      STEP 2: JSON GENERATION
      Generate the strict JSON content array based on your plan.

      ALLOWED BLOCK TYPES:
      - { "type": "heading", "text": "..." }
      - { "type": "paragraph", "text": "..." }
      - { "type": "code", "language": "javascript", "code": "..." }
      - { "type": "mcq", "question": "...", "options": ["A", "B"], "answer": 0, "explanation": "..." }
      - { "type": "video", "query": "exact search term for youtube" } 
      - { "type": "link", "title": "...", "url": "https://..." }

      EXAMPLE OUTPUT:
      {
        "_thought": "I will explain Loops using a real-world analogy of a factory line...",
        "title": "Lesson Title",
        "objectives": ["Obj 1", "Obj 2"],
        "content": [
          { "type": "heading", "text": "Introduction" },
          { "type": "paragraph", "text": "Concept explanation..." },
          { "type": "code", "language": "python", "code": "print('Hello')" },
          { "type": "video", "query": "Python loops tutorial" },
          { "type": "mcq", "question": "What is X?", "options": ["A", "B"], "answer": 0, "explanation": "Reason." }
        ]
      }
      `;

      const userPrompt = `
      Create a detailed lesson for: "${lesson.title}".
      Context: Module "${moduleTitle}" in Course "${courseTitle}".
      `;

      // Call AI
      structuredLesson = await modelGateway.generateStructured(
        `${systemPrompt}\n\nUSER REQUEST: ${userPrompt}`,
        lessonResponseSchema,
        TaskTier.CREATIVE_WRITING,
      );

      // ---------------------------------------------------------
      // 🎥 YOUTUBE ENRICHMENT & LINK SANITIZER
      // ---------------------------------------------------------
      if (structuredLesson.content && Array.isArray(structuredLesson.content)) {
        logger.info("🎥 Enriching lesson with YouTube content...");

        const enrichedContent = await Promise.all(
          structuredLesson.content.map(async (block: any) => {
            // ✅ FIX 1: Process ALL video blocks (even if query is missing)
            if (block.type === "video") {
              // Fallback: Use lesson title if query is missing/empty
              // This prevents "undefined" from ever reaching the URL
              const query = block.query || lesson.title;
              let videoData = null;

              if (query) {
                videoData = await youtubeService.searchVideo(query);
              }
              // console.log("YouTube Search Data:", videoData);

              if (videoData) {
                return {
                  type: "video",
                  url: `https://www.youtube.com/watch?v=${videoData.videoId}`,
                  title: videoData.title,
                  thumbnail: videoData.thumbnail,
                };
              } else {
                // ✅ FIX 2: Safe Fallback Link
                const safeQuery = query || "Educational Video";

                logger.warn(
                  `⚠️ YouTube search failed for: "${safeQuery}". Falling back to Link.`,
                );

                return {
                  type: "link",
                  title: `Watch Related Video`,
                  url: `https://www.youtube.com/results?search_query=${encodeURIComponent(safeQuery)}`,
                  description: `Search results for ${safeQuery}`,
                };
              }
            }
            if (block.type === "code") {
              // This will execute python code, fix errors, and return verified code
              return await codeExecutionService.verifyCodeBlock(block);
            }
            // ✅ FIX 3: Sanitize AI-Hallucinated Broken Links
            // If the AI generated a link with "undefined" in the URL, fix it.
            if (block.type === "link") {
              if (!block.url || block.url.includes("undefined")) {
                const cleanQuery = block.title || lesson.title;
                return {
                  ...block,
                  url: `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`,
                  description:
                    block.description || "Learn more about this topic",
                };
              }
            }

            return block;
          }),
        );

        structuredLesson.content = enrichedContent;
      }

      // console.log("Structured Lesson Content:", structuredLesson);
      // Save to Cache (Background)
      semanticCache
        .setCachedLesson(courseTitle, lesson.title, structuredLesson)
        .catch((e) => logger.error("Failed to cache lesson:", e));
    }

    // ---------------------------------------------------------
    // 5. SAVE & DEDUCT
    // ---------------------------------------------------------
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
      // 🚨 SAFETY NET: If saving fails, REFUND the user immediately
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
