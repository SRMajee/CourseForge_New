import mongoose from "mongoose";
import { Course } from "../models/Course";
import { Module } from "../models/Module";
import { Lesson, ILesson } from "../models/Lesson";
import { User } from "../models/User";
import logger from "../utils/logger";
import { v2 as cloudinary } from "cloudinary";
import { CREDIT_COSTS } from "../config/credits"; // 👈 Import Config
import { modelGateway, TaskTier } from "./ModelGateway";
import { semanticCache } from "../utils/semanticCache";
import { outlineSchema } from "../ai/parsers/courseSchema";
import { researchService } from "./ResearchService";
import { creditService } from "./creditService"; // 👈 Import
import { redisClient } from "../config/redis";
import { clarificationService } from "./ClarificationService";
import { imageService } from "./imageService";
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
    const balance = await creditService.getBalance(userId);
    if (balance < cost) {
      throw new Error(
        `Insufficient credits. Required: ${cost}, Available: ${balance}`,
      );
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
        // Context Injection
        let scopingContext = "";
        if (
          options.userAnswers &&
          Object.keys(options.userAnswers).length > 0
        ) {
          scopingContext = Object.entries(options.userAnswers)
            .map(([k, v]) => `Question: ${k} -> Answer: ${v}`)
            .join("\n");
          logger.info(`🎯 [Scoping] Applied User Context:\n${scopingContext}`);
        }

        // Research
        const searchTopic = scopingContext
          ? `${topic} with context: ${scopingContext}`
          : topic;
        const webContext =
          await researchService.getTechnicalContext(searchTopic);
        // B. System Prompt (Refined by Scope)
        const systemPrompt = `
      You are an expert curriculum designer.
      
      STEP 1: THOUGHT PROCESS (_thought)
      First, analyze the user's topic and preferences. 
      - Plan the logical flow: Beginner -> Intermediate -> Advanced.
      - Ensure prerequisites are covered early.
      - Define specific learning goals for each module.
      - Explain your reasoning in the '_thought' field.
      
      STEP 2: JSON GENERATION
      Based on your thoughts, generate the strict JSON syllabus.
      
      ${scopingContext ? `🔥 CRITICAL USER PREFERENCES:\n${scopingContext}\n(You MUST tailor the content to match these preferences strictly.)\n` : ""}
      
      ${webContext ? `WEB CONTEXT:\n${webContext}\n` : ""}
      
      Create a detailed course syllabus for: "${topic}".

      EXAMPLE OUTPUT FORMAT:
      {
        "_thought": "User wants a Data Science course. I will start with Pandas basics, then move to Visualization...",
        "title": "Course Name",
        "description": "Brief summary...",
        "tags": ["Tag1", "Tag2"],
        "modules": [
          { "title": "Module 1", "lessons": [{ "title": "Lesson 1.1" }] }
        ]
      }
    `;

        syllabusData = await modelGateway.generateStructured(
          systemPrompt,
          outlineSchema,
          planningTier,
        );

        // Save to Cache (Fire & Forget)
        semanticCache
          .setCachedOutline(cacheKey, syllabusData)
          .catch((e) => logger.error("Cache Write Error", e));
      }
      const thumbnailUrl = await imageService.getCourseThumbnail(topic);
      // 6. Save to DB (Pure Persistence)
      const course = await this.saveCourseToDb(
        userId,
        syllabusData,
        thumbnailUrl,
        requestedMode,
      );
      return course;
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
    });
  }

  /**
   * TRANSACTIONAL: Creates a Course from AI Syllabus & Deducts Credits
   * (Now called internally by generateCourse)
   */
  /**
   * Helper: Pure DB Transaction (No Credit Logic)
   */
  private async saveCourseToDb(
    userId: string,
    data: any,
    thumbnailUrl: string,
    mode: "standard" | "pro",
  ) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const course = new Course({
        userId,
        title: data.title,
        description: data.description,
        tags: data.tags,
        modules: [],
        // ⚡ NEW FIELDS
        thumbnailUrl: thumbnailUrl,
        generationMode: mode,
      });

      const savedCourse = await course.save({ session });

      // ... (Keep existing Module/Lesson creation logic exactly as is) ...
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
  // --- READ / UTILITY METHODS ---

  async getCourseById(courseId: Object | string) {
    return await Course.findById(courseId).populate({
      path: "modules",
      populate: { path: "lessons", select: "title isEnriched" },
    });
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
        .select("title description modules tags createdAt"),
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
