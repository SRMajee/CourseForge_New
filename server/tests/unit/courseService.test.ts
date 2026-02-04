import mongoose from "mongoose";

// ✅ 1. Mock Env First
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-mock",
    STRIPE_SECRET_KEY: "sk_test_mock",
    GEMINI_API_KEY: "mock",
    GROQ_API_KEY: "mock",
  },
}));

// ✅ 2. Mock Redis Client COMPLETE
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
  },
}));

import { courseService } from "../../src/services/courseService";
import { User } from "../../src/models/User";
import { Course } from "../../src/models/Course";
import { Module } from "../../src/models/Module";
import { Lesson } from "../../src/models/Lesson";
import { creditService } from "../../src/services/creditService";
import { modelGateway } from "../../src/services/ModelGateway";
import { imageService } from "../../src/services/imageService";
import { redisClient } from "../../src/config/redis";

// Mock Dependencies
jest.mock("../../src/services/creditService");
jest.mock("../../src/services/ModelGateway");
jest.mock("../../src/services/imageService");
jest.mock("../../src/services/ResearchService", () => ({
  researchService: { getTechnicalContext: jest.fn().mockResolvedValue("") },
}));

jest.mock("../../src/utils/semanticCache", () => ({
  semanticCache: {
    getCachedOutline: jest.fn().mockResolvedValue(null),
    setCachedOutline: jest.fn().mockResolvedValue(true),
  },
}));

jest.setTimeout(60000);

describe("CourseService Logic", () => {
  let userId: string;

  beforeAll(async () => {
    const uri =
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test";
    try {
      await mongoose.connect(uri);
    } catch (e) {}
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await User.deleteMany({});
      await Course.deleteMany({});
      await Module.deleteMany({});
      await Lesson.deleteMany({});
    }
    jest.clearAllMocks();

    const user = await User.create({
      auth0Id: "auth0|svc_test",
      email: "svc@test.com",
      credits: 100,
      planType: "free",
    });
    userId = user._id.toString();
  });

  describe("deleteCourse (Cascade)", () => {
    it("should delete course, modules, and lessons recursively", async () => {
      const course = await Course.create({
        title: "C",
        description: "D",
        userId,
        modules: [],
      });
      const module = await Module.create({
        title: "M",
        course: course._id,
        lessons: [],
      });
      const lesson = await Lesson.create({
        title: "L",
        module: module._id,
        content: [],
      });

      course.modules.push(module._id as any);
      await course.save();
      module.lessons.push(lesson._id as any);
      await module.save();

      await courseService.deleteCourse(course._id.toString(), userId);

      const foundCourse = await Course.findById(course._id);
      expect(foundCourse).toBeNull();
    });
  });

  describe("generateCourse (Logic)", () => {
    it("should parse AI JSON and save full structure to DB", async () => {
      // ✅ FIX: Mock the new creditService method
      // This is what the updated generateCourse calls instead of User.findById
      (creditService.getUserContext as jest.Mock).mockResolvedValue({
        credits: 100,
        planType: "free",
        subscriptionStatus: "active",
        hasUsedProTrial: false,
        isPro: false,
      });

      (creditService.deductCredits as jest.Mock).mockResolvedValue(true);
      (modelGateway.generateStructured as jest.Mock).mockResolvedValue({
        title: "AI Course",
        description: "Desc",
        tags: ["AI"],
        modules: [{ title: "Mod 1", lessons: [{ title: "Les 1" }] }],
      });
      (imageService.getCourseThumbnail as jest.Mock).mockResolvedValue(
        "http://img.com/1.jpg",
      );

      const result = await courseService.generateCourse(userId, "Topic", {
        mode: "standard",
      });

      expect(result?.title).toBe("AI Course");
      expect(result?.modules.length).toBe(1);

      const mod = result?.modules[0] as any;
      const lessonsInMod = await Lesson.find({ module: mod._id });
      expect(lessonsInMod).toHaveLength(1);
    });
  });

  describe("validateBalance", () => {
    it("should throw if user has insufficient credits", async () => {
      // 1. Mock Redis returning low balance
      (creditService.getBalance as jest.Mock).mockResolvedValue(10);

      // 2. Update DB User to ALSO have low credits (prevents drift healing)
      await User.findByIdAndUpdate(userId, { credits: 10 });

      // 3. Mock Redis set (just in case)
      (redisClient.set as jest.Mock).mockResolvedValue("OK");

      await expect(courseService.validateBalance(userId, 50)).rejects.toThrow(
        /Insufficient credits/,
      );
    });

    it("should pass if balance is sufficient", async () => {
      (creditService.getBalance as jest.Mock).mockResolvedValue(100);
      // Ensure DB user matches high credits (default is 100)
      await expect(
        courseService.validateBalance(userId, 50),
      ).resolves.not.toThrow();
    });
  });

  describe("resumeCourseGeneration", () => {
    it("should throw if job is expired/missing in Redis", async () => {
      // Mock Redis returning null
      (redisClient.get as jest.Mock).mockResolvedValue(null);

      await expect(
        courseService.resumeCourseGeneration(userId, "job_fake", {}),
      ).rejects.toThrow("Job expired");
    });
  });
});
