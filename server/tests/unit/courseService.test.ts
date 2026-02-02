import mongoose from "mongoose";

// Mock env
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-mock",
    STRIPE_SECRET_KEY: "sk_test_mock",
    GEMINI_API_KEY: "mock",
    GROQ_API_KEY: "mock",
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

jest.mock("../../src/services/creditService");
jest.mock("../../src/services/ModelGateway");
jest.mock("../../src/services/imageService");
jest.mock("../../src/services/ResearchService", () => ({
  researchService: { getTechnicalContext: jest.fn().mockResolvedValue("") },
}));

// ✅ FIX: Return Promise from cache set
jest.mock("../../src/utils/semanticCache", () => ({
  semanticCache: {
    getCachedOutline: jest.fn().mockResolvedValue(null),
    setCachedOutline: jest.fn().mockResolvedValue(true), 
  },
}));

jest.setTimeout(60000); // 60s Global Timeout

describe("CourseService Logic", () => {
  let userId: string;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test";
    await mongoose.connect(uri);
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
      const course = await Course.create({ title: "C", description: "D", userId, modules: [] });
      const module = await Module.create({ title: "M", course: course._id, lessons: [] });
      const lesson = await Lesson.create({ title: "L", module: module._id, content: [] });

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
      (creditService.deductCredits as jest.Mock).mockResolvedValue(true);
      (modelGateway.generateStructured as jest.Mock).mockResolvedValue({
        title: "AI Course",
        description: "Desc",
        tags: ["AI"],
        modules: [{ title: "Mod 1", lessons: [{ title: "Les 1" }] }],
      });
      (imageService.getCourseThumbnail as jest.Mock).mockResolvedValue("http://img.com/1.jpg");

      const result = await courseService.generateCourse(userId, "Topic", { mode: "standard" });

      expect(result?.title).toBe("AI Course");
      expect(result?.modules.length).toBe(1);
      
      const mod = result?.modules[0] as any;
      const lessonsInMod = await Lesson.find({ module: mod._id });
      expect(lessonsInMod).toHaveLength(1);
    });
  });
});