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
  async generateCourse(userId: string, topic: string) {
    const COST = CREDIT_COSTS.CREATE_COURSE;

    // 1. Pre-flight Check
    await this.validateBalance(userId, COST);
    // ✅ FETCH USER TO CHECK PLAN
    const user = await User.findById(userId);
    const isPro =
      user?.planType === "PRO" || user?.subscriptionStatus === "active";
    // ✅ SELECT TIER BASED ON PLAN
    const planningTier = isPro
      ? TaskTier.COMPLEX_PLANNING
      : TaskTier.BASIC_PLANNING;

    logger.info(
      `👤 User ${userId} is ${isPro ? "PRO" : "FREE"}. Using Tier: ${planningTier}`,
    );

    // 2. Check Cache
    let syllabusData = await semanticCache.getCachedOutline(topic);

    if (syllabusData) {
      logger.info(`⚡ [Cache Hit] Skipping Research & AI for: ${topic}`);
      await new Promise((r) => setTimeout(r, 1500));
    } else {
      // 🛑 CACHE MISS: Do the expensive work
      logger.info(`🐢 [Cache Miss] Starting fresh generation for: ${topic}`);

      // A. Research
      const webContext = await researchService.getTechnicalContext(topic);

      // B. System Prompt (Moved from Controller)
      const systemPrompt = `
        You are an expert curriculum designer.
        ${webContext ? `CRITICAL CONTEXT FROM WEB SEARCH:\n${webContext}\n` : ""}
        Create a detailed course syllabus.
        IMPORTANT: Output strictly valid JSON.
        Structure the 'lessons' array as OBJECTS, not strings.

        EXAMPLE OUTPUT FORMAT:
        {
          "title": "Course Name",
          "description": "Brief summary...",
          "tags": ["Tag1", "Tag2"],
          "modules": [
            {
              "title": "Module 1",
              "lessons": [
                { "title": "Lesson 1.1" },
                { "title": "Lesson 1.2" }
              ]
            }
          ]
        }
      `;

      // C. AI Generation
      syllabusData = await modelGateway.generateStructured(
        systemPrompt,
        outlineSchema,
        planningTier,
      );

      // D. Save to Cache (Background)
      logger.info(`💾 Saving to cache...`);
      await semanticCache
        .setCachedOutline(topic, syllabusData)
        .catch((err) => logger.error("Failed to set cache:", err));
    }

    // 3. Persist to DB (Transaction)
    return await this.createFromTemplate(userId, syllabusData);
  }

  /**
   * TRANSACTIONAL: Creates a Course from AI Syllabus & Deducts Credits
   * (Now called internally by generateCourse)
   */
  async createFromTemplate(userId: string, data: any) {
    const COST = CREDIT_COSTS.CREATE_COURSE;

    // 🛑 1. ATOMIC DEDUCTION (Redis)
    // We try to deduct FIRST. If this fails, we stop.
    // This prevents the race condition where they spend credits elsewhere mid-generation.
    const isDeducted = await creditService.deductCredits(userId, COST);

    if (!isDeducted) {
      throw new Error(
        "Insufficient credits (Balance changed during generation)",
      );
    }

    logger.info(`💰 Deducted ${COST} credits for Course Creation`);

    // 2. MongoDB Transaction (Only for saving data now)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create Course
      const course = new Course({
        userId,
        title: data.title,
        description: data.description,
        tags: data.tags,
        modules: [],
      });
      const savedCourse = await course.save({ session });

      // Create Modules & Lessons
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
      await creditService.addCredits(userId, COST);
      logger.error("❌ Course Creation Failed:", error);
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

  async getUserCourses(userId: string) {
    return await Course.find({ userId })
      .sort({ createdAt: -1 })
      .select("title description modules tags createdAt");
  }

  async getAllCourses() {
    return await Course.find()
      .sort({ createdAt: -1 })
      .select("title description tags createdAt userId");
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
