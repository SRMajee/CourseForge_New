import mongoose from "mongoose";
import { Course } from "../models/Course";
import { Module } from "../models/Module";
import { Lesson, ILesson } from "../models/Lesson";
import { User } from "../models/User";
import logger from "../utils/logger";
import { v2 as cloudinary } from "cloudinary";
import { CREDIT_COSTS } from "../config/credits"; // 👈 Import Config
import { modelGateway, TaskTier } from "../ai/services/ModelGateway";
import { semanticCache } from "../utils/semanticCache";
import {
  lessonResponseSchema,
  outlineSchema,
} from "../ai/parsers/courseSchema";
import { researchService } from "./ResearchService";
import { creditService } from "./creditService"; // 👈 Import
import { redisClient } from "../config/redis";
import { imageService } from "./imageService";
import { getVectorStore } from "./vectorStore";
import { youtubeService } from "./youtubeService";
import { codeExecutionService } from "./CodeExecutionService";
import { PROMPTS } from "../ai/prompts/prompts";

export class ClarificationNeededError extends Error {
  public data: any;
  constructor(data: any) {
    super("Clarification Needed");
    this.name = "ClarificationNeededError";
    this.data = data;
  }
}
export interface GenerateOptions {
  userAnswers?: any;
  mode?: "standard" | "pro"; // 👈 New Option
}
export class CourseService {
  /**
   * ⚡ NEW: Redis-Based Pre-flight Check
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
  /**
   * ✅ FIXED: Pure Generation Logic
   * Removed internal Ambiguity Check. The Controller/Worker is responsible for that.
   * This prevents "ClarificationNeededError" from crashing background jobs.
   */
  async generateCourse(
    userId: string,
    topic: string,
    options: GenerateOptions = {},
  ) {
    const user = await User.findById(userId);
    // const user = await creditService.getUserContext(userId);
    if (!user) throw new Error("User not found");

    const requestedMode = options.mode || "standard";
    const isUserPro =
      user.planType === "PRO" || user.subscriptionStatus === "active";

    // 2. Calculate Cost & Trial Logic
    let cost = CREDIT_COSTS.CREATE_COURSE; // Default 50
    let isTrialRun = false;

    if (requestedMode === "pro") {
      if (isUserPro) {
        // Pro User paying for Pro gen
        cost = CREDIT_COSTS.CREATE_COURSE_PRO;
      } else {
        // Free User attempting Pro
        if (!user.hasUsedProTrial) {
          // 🎉 Activate Trial
          isTrialRun = true;
          cost = 0; // Freebie
          logger.info(`✨ User ${userId} is using their One-Time PRO Trial.`);
        } else {
          // 🛑 Block access
          throw new Error(
            "Pro Mode requires a subscription. You have already used your free trial.",
          );
        }
      }
    }

    // 3. Determine AI Model Tier
    // Pro Mode = DeepSeek/Llama 70B (Logic). Standard = Llama 8B (Fast).
    const planningTier =
      requestedMode === "pro"
        ? TaskTier.LOGIC_REASONING
        : TaskTier.FAST_UTILITY;
    const model = modelGateway.getChatModel(planningTier);

    const structuredLlm = model.withStructuredOutput(outlineSchema);
    const chain = PROMPTS.COURSE_OUTLINE.pipe(structuredLlm);
    logger.info(
      `👤 User ${userId} | Mode: ${requestedMode.toUpperCase()} | Tier: ${planningTier} | Cost: ${cost}`,
    );

    // 4. Check Cache (Include mode in key so Pro results aren't served to Standard users)
    const cacheKey = `${topic}-${JSON.stringify(options.userAnswers || {})}-${requestedMode}`;
    let syllabusData = await semanticCache.getCachedOutline(cacheKey);

    // ✅ FIX: Transaction Logic moved OUTSIDE "if (!syllabusData)"
    // We must charge the user/mark trial used regardless of Cache Hit or Miss.
    if (isTrialRun) {
      // Atomic Update: Ensure they haven't used it in a race condition
      const updated = await User.findOneAndUpdate(
        { _id: userId, hasUsedProTrial: false },
        { $set: { hasUsedProTrial: true } },
      );
      await redisClient.del(`user:${userId}:context`);
      if (!updated) {
        throw new Error("Pro trial already used.");
      }
    } else {
      // Standard Deduction
      const isDeducted = await creditService.deductCredits(userId, cost);

      // Log whether it was a cache hit or miss for debugging
      logger.info(
        `💰 Deducted ${cost} credits. Cache Hit: ${!!syllabusData}. Starting Process...`,
      );

      if (!isDeducted) throw new Error("Insufficient credits");
    }
    try {
      // 5. Run AI Generation (If not cached)
      if (!syllabusData) {
        let thumbnailUrl =
          "https://images.unsplash.com/photo-1557682250-33bd709cbe85";
        // Run AI & Image Fetching simultaneously
        const [generatedSyllabus, fetchedImage] = await Promise.all([
          // Task A: AI Generation (The Heavy Lift)
          (async () => {
            // A1. Context Injection
            let scopingContext = "";
            if (
              options.userAnswers &&
              Object.keys(options.userAnswers).length > 0
            ) {
              scopingContext = Object.entries(options.userAnswers)
                .map(([k, v]) => `Question: ${k} -> Answer: ${v}`)
                .join("\n");
            }

            // A2. Research (Parallelizable sub-task, but kept linear for context flow)
            const searchTopic = scopingContext
              ? `${topic} with context: ${scopingContext}`
              : topic;
            const webContext =
              await researchService.getTechnicalContext(searchTopic);

            // A3. RAG Search
            let ragContext = "";
            try {
              const vectorStore = getVectorStore();
              const results = await vectorStore.similaritySearch(topic, 2);
              if (results.length > 0) {
                ragContext = results.map((doc) => doc.pageContent).join("\n\n");
              }
            } catch (error) {
              logger.warn("⚠️ [RAG] Skipped:", error);
            }
       const result = await chain.invoke({
              topic: topic,
              ragContext: ragContext || "", // Handle empty context safely
              scopingContext: scopingContext || "None",
              webContext: webContext || "None",
            });

            // Fire-and-Forget Cache Write
            semanticCache
              .setCachedOutline(cacheKey, result)
              .catch((e) => logger.error("Cache Write Fail", e));

            return result;
          })(),

          // Task B: Image Fetching (Runs while AI is thinking)
          (async () => {
            try {
              const url = await imageService.getCourseThumbnail(topic);
              return url || thumbnailUrl;
            } catch (e) {
              return thumbnailUrl; // Fail silently to default
            }
          })(),
        ]);
        syllabusData = generatedSyllabus;
        thumbnailUrl = fetchedImage;
        // 6. Save to DB (Pure Persistence)
        const course = await this.saveCourseToDb(
          userId,
          syllabusData,
          thumbnailUrl,
          requestedMode,
        );
        return course;
      }
      const url = await imageService.getCourseThumbnail(topic);
      return await this.saveCourseToDb(
        userId,
        syllabusData,
        url, // Or fetch image if needed
        requestedMode,
      );
    } catch (error) {
      // 🚨 FAILURE: REFUND CREDITS
      logger.error("❌ Generation Failed. Refunding user...", error);
      if (isTrialRun) {
        // Restore Trial
        await User.findByIdAndUpdate(userId, { hasUsedProTrial: false });
      } else {
        // Refund Credits
        await creditService.addCredits(userId, cost);
      }
      throw error;
    }
  }

  /**
   * Resume Handler
   * Still useful as a wrapper for the Controller to call
   */
  async resumeCourseGeneration(userId: string, jobId: string, answers: any) {
    const stateRaw = await redisClient.get(jobId);
    if (!stateRaw) throw new Error("Job expired");

    const state = JSON.parse(stateRaw);
    if (state.userId !== userId) throw new Error("Unauthorized");

    await redisClient.del(jobId);

    // Directly call generate, injecting the answers
    return this.generateCourse(userId, state.topic, {
      userAnswers: answers,
      mode: state.mode || "standard",
    });
  }


  async getCourseById(courseId: Object | string) {
    return await Course.findById(courseId).populate({
      path: "modules",
      populate: { path: "lessons", select: "title isEnriched" },
    });
  }
  // ✅ UPDATED: Regenerate with Tag Enforcement & Mode Fix
  async regenerateCourse(
    courseId: string,
    userId: string,
    instruction: string,
    mode: "standard" | "pro" = "standard",
  ) {
    const course = await Course.findOne({ _id: courseId, userId });
    if (!course) throw new Error("Course not found");
    const COST_PRO = Number(CREDIT_COSTS.COST_REGENERATE_COURSE_PRO) || 75;
    const COST = Number(CREDIT_COSTS.COST_REGENERATE_COURSE) || 25;
    const cost = mode === "pro" ? COST_PRO : COST;
    await this.validateBalance(userId, cost);
    await creditService.deductCredits(userId, cost);
    const tier =
      mode === "pro" ? TaskTier.LOGIC_REASONING : TaskTier.FAST_UTILITY;
    const model = modelGateway.getChatModel(tier);

    const structuredLlm = model.withStructuredOutput(outlineSchema);
    const chain = PROMPTS.REGENERATE_OUTLINE.pipe(structuredLlm);

    try {
     const newSyllabus = await chain.invoke({
        instruction: instruction || "Make it better",
        title: course?.title || "Untitled Course",
        description: course?.description || "No description",
      });

      // ✅ Pass 'instruction' to archive the OLD version before overwriting
      const updatedCourse = await this.saveCourseToDb(
        userId,
        { ...newSyllabus, title: course.title, tags: course.tags },
        course.thumbnailUrl!,
        mode,
        courseId,
        instruction, // 👈 New: Archive Instruction
      );

      return updatedCourse;
    } catch (error) {
      await creditService.addCredits(userId, cost);
      throw error;
    }
  }

  // ✅ UPDATED: Refine Lesson with Mode History
  async refineLesson(
    lessonId: string,
    userId: string,
    instruction: string,
    mode: "standard" | "pro" = "standard",
  ) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");
    const COST_PRO = Number(CREDIT_COSTS.COST_REGENERATE_LESSON_PRO) || 25;
    const COST = Number(CREDIT_COSTS.COST_REGENERATE_LESSON) || 15;
    const cost = mode === "pro" ? COST_PRO : COST;
    await this.validateBalance(userId, cost);
    await creditService.deductCredits(userId, cost);

    const tier =
      mode === "pro" ? TaskTier.CREATIVE_WRITING : TaskTier.FAST_UTILITY;
    const model = modelGateway.getChatModel(tier);

    const structuredLlm = model.withStructuredOutput(lessonResponseSchema);
    const chain = PROMPTS.REFINE_LESSON.pipe(structuredLlm);

    try {
  
      let refinedLesson = await chain.invoke({
        instruction: instruction,

        title: lesson.title,
        content: lesson.content,
        objectives: lesson.objectives,
      });
      if (refinedLesson.content && Array.isArray(refinedLesson.content)) {
        logger.info("🎥 Enriching lesson with YouTube content...");

        const enrichedContent = await Promise.all(
          refinedLesson.content.map(async (block: any) => {
            // ✅ FIX 1: Process ALL video blocks (even if query is missing)
            if (block.type === "video") {
              const query = block.query || lesson.title;
              let videoData = null;

              if (query) {
                // ✅ SAFETY: Wrap in try/catch to ensure Quota errors don't crash generation
                try {
                  videoData = await youtubeService.searchVideo(query);
                } catch (e) {
                  logger.warn(
                    `Bypassed YouTube search for "${query}" due to error.`,
                  );
                  videoData = null;
                }
              }

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
                  `⚠️ YouTube fallback active for: "${safeQuery}". Generating Link block.`,
                );

                return {
                  type: "link",
                  title: `Watch Related Video: ${safeQuery}`,
                  url: `https://www.youtube.com/results?search_query=${encodeURIComponent(safeQuery)}`,
                  description: `Click here to search for videos about ${safeQuery}`,
                };
              }
            }
            if (block.type === "code") {
              // This will execute python code, fix errors, and return verified code
              return await codeExecutionService.verifyCodeBlock(block);
            }
            // ✅ FIX 3: Sanitize AI-Hallucinated Broken Links
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

        refinedLesson.content = enrichedContent;
      }

      if (!lesson.history) lesson.history = [];

      // ✅ Archive current state with Mode
      // We assume the lesson has a generationMode field or we default to standard if not tracked before
      // (Note: You might need to add generationMode to Lesson Schema if not present, otherwise this is just metadata in history)
      lesson.history.push({
        timestamp: new Date(),
        instruction: "Original (Pre-refinement)",
        content: lesson.content,
        // @ts-ignore - Assuming Lesson schema will be updated or using Mixed for history
        generationMode: (lesson as any).generationMode || "standard",
      });

      lesson.content = refinedLesson.content;
      lesson.objectives = refinedLesson.objectives || lesson.objectives;
      lesson.isEnriched = true;
      // @ts-ignore
      lesson.generationMode = mode; // Update current mode

      await lesson.save();

      return lesson;
    } catch (error) {
      await creditService.addCredits(userId, cost);
      throw error;
    }
  }

  // ✅ NEW: Get Lesson Version
  async getLessonVersion(lessonId: string, historyIndex: number) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson || !lesson.history || !lesson.history[historyIndex]) {
      throw new Error("Version not found");
    }

    const versionSnapshot = lesson.history[historyIndex];

    // Return synthetic object
    return {
      ...lesson.toObject(),
      content: versionSnapshot.content,
      isHistoricalView: true,
      versionDate: versionSnapshot.timestamp,
      versionInstruction: versionSnapshot.instruction,
      // @ts-ignore
      generationMode: versionSnapshot.generationMode || "standard",
    };
  }
  // ✅ UPDATED: Apply Historical Mode to View
  async getCourseVersion(courseId: string, historyIndex: number) {
    const course = await Course.findById(courseId);
    if (!course || !course.history || !course.history[historyIndex]) {
      throw new Error("Version not found");
    }

    const versionSnapshot = course.history[historyIndex];

    const modules = await Module.find({
      _id: { $in: versionSnapshot.modules },
    }).populate("lessons");

    // Return synthetic object with correct Historical Mode
    return {
      ...course.toObject(),
      modules: modules,
      isHistoricalView: true,
      versionDate: versionSnapshot.timestamp,
      versionInstruction: versionSnapshot.instruction,
      // 👈 Use the snapshot's mode, fallback to current if missing
      generationMode: versionSnapshot.generationMode || course.generationMode,
    };
  }

  // ✅ UPDATED: Save Logic with Mode Archival
  private async saveCourseToDb(
    userId: string,
    data: any,
    thumbnailUrl: string,
    mode: "standard" | "pro",
    existingCourseId?: string,
    archiveInstruction?: string,
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let course;

      if (existingCourseId) {
        course = await Course.findById(existingCourseId).session(session);
        if (!course) throw new Error("Course to update not found");

        if (archiveInstruction) {
          if (!course.history) course.history = [];
          course.history.push({
            timestamp: new Date(),
            instruction: archiveInstruction,
            modules: [...course.modules],
            // ✅ Archive the CURRENT mode before it changes
            generationMode: course.generationMode,
          });
        }

        course.modules = [];
        course.title = data.title;
        course.description = data.description;
        course.tags = data.tags; // ✅ Always update tags
        course.thumbnailUrl = thumbnailUrl;
        course.generationMode = mode; // ✅ Set new mode
      } else {
        course = new Course({
          userId,
          title: data.title,
          description: data.description,
          tags: data.tags,
          modules: [],
          thumbnailUrl: thumbnailUrl,
          generationMode: mode,
        });
      }

      const savedCourse = await course.save({ session });

      for (const modData of data.modules) {
        const newModule = new Module({
          course: savedCourse._id,
          title: modData.title,
          lessons: [],
        });
        const savedModule = await newModule.save({ session });

        const lessonDocs = modData.lessons.map((lessonData: any) => ({
          module: savedModule._id,
          title: lessonData.title || lessonData,
          content: [],
          objectives: [],
        }));

        if (lessonDocs.length > 0) {
          const createdLessons = await Lesson.insertMany(lessonDocs, {
            session,
          });
          savedModule.lessons = createdLessons.map((l) => l._id as any);
          await savedModule.save({ session });
        }
        savedCourse.modules.push(savedModule._id as any);
      }

      await savedCourse.save({ session });
      await session.commitTransaction();

      return this.getCourseById(savedCourse._id);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  /**
   * ✅ UPDATED: Supports Pagination
   */
  async getUserCourses(userId: string, page: number = 1, limit: number = 9) {
    const skip = (page - 1) * limit;

    // Run count and query in parallel for performance
    const [courses, total] = await Promise.all([
      Course.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "title description modules tags createdAt thumbnailUrl generationMode",
        ),
      Course.countDocuments({ userId }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  getPublicIdFromUrl = (url: string) => {
    try {
      const regex = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;
      const match = url.match(regex);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch (error) {
      console.error("Error extracting public ID from URL:", url, error);
      return null;
    }
  };

  /**
   * Collects all Cloudinary IDs (Legacy String + New Map) from a list of lessons
   */
  private collectPublicIds(lessons: ILesson[]): string[] {
    const publicIds: string[] = [];

    lessons.forEach((l) => {
      // 1. Check Legacy Field (Cast to any to access potentially undefined legacy field)
      const legacyUrl = (l as any).audioUrl;
      if (legacyUrl && typeof legacyUrl === "string") {
        const pid = this.getPublicIdFromUrl(legacyUrl);
        if (pid) publicIds.push(pid);
      }

      // 2. Check New Map Field
      if (l.audioUrls && l.audioUrls instanceof Map && l.audioUrls.size > 0) {
        l.audioUrls.forEach((url) => {
          if (url) {
            const pid = this.getPublicIdFromUrl(url);
            if (pid) publicIds.push(pid);
          }
        });
      }
    });

    // Remove duplicates
    return [...new Set(publicIds)];
  }

  deleteCourse = async (courseId: string, userId: string) => {
    const course = await Course.findOne({ _id: courseId, userId });
    if (!course) throw new Error("Course not found or unauthorized");

    const modules = await Module.find({ _id: { $in: course.modules } });
    const moduleIds = modules.map((m) => m._id);
    const lessons = await Lesson.find({ module: { $in: moduleIds } });

    // Collect IDs using helper
    const publicIds = this.collectPublicIds(lessons);

    // Delete from Cloudinary
    if (publicIds.length > 0) {
      try {
        logger.info(`Deleting ${publicIds.length} files from Cloudinary...`);
        await cloudinary.api.delete_resources(publicIds, {
          resource_type: "video",
        });
      } catch (err) {
        logger.error("Cloudinary Bulk Delete Error:", err);
      }
    }

    // DB Transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Lesson.deleteMany({ module: { $in: moduleIds } }).session(session);
      await Module.deleteMany({ _id: { $in: moduleIds } }).session(session);
      await Course.findByIdAndDelete(courseId).session(session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return { message: "Course and all files deleted successfully" };
  };

  deleteModule = async (moduleId: string) => {
    const module = await Module.findById(moduleId);
    if (!module) throw new Error("Module not found");

    const lessons = await Lesson.find({ _id: { $in: module.lessons } });
    const publicIds = this.collectPublicIds(lessons);

    if (publicIds.length > 0) {
      try {
        await cloudinary.api.delete_resources(publicIds, {
          resource_type: "video",
        });
      } catch (err) {
        logger.error("Cloudinary Module Delete Error:", err);
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Lesson.deleteMany({ _id: { $in: module.lessons } }).session(
        session,
      );
      await Course.findByIdAndUpdate(module.course, {
        $pull: { modules: moduleId },
      }).session(session);
      await Module.findByIdAndDelete(moduleId).session(session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return { message: "Module and files deleted successfully" };
  };

  deleteLesson = async (lessonId: string) => {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new Error("Lesson not found");

    // Re-use logic for single lesson (array of 1)
    const publicIds = this.collectPublicIds([lesson]);

    if (publicIds.length > 0) {
      try {
        await cloudinary.api.delete_resources(publicIds, {
          resource_type: "video",
        });
      } catch (err) {
        logger.error("Cloudinary Lesson Delete Error:", err);
      }
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await Module.findByIdAndUpdate(lesson.module, {
        $pull: { lessons: lessonId },
      }).session(session);
      await Lesson.findByIdAndDelete(lessonId).session(session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    return { message: "Lesson and file deleted successfully" };
  };
}

export const courseService = new CourseService();
