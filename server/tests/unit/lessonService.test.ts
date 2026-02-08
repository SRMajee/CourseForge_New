import mongoose from "mongoose";

// ✅ 1. Mock Env
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    OPENAI_API_KEY: "sk-mock",
    STRIPE_SECRET_KEY: "sk_test_mock",
    GEMINI_API_KEY: "mock",
    GROQ_API_KEY: "mock",
  },
}));

// ✅ 2. Mock Config Credits directly (Since lessonService imports it)
jest.mock("../../src/config/credits", () => ({
  CREDIT_COSTS: {
    GENERATE_LESSON: 35,
    COST_REGENERATE_LESSON: 15,
    EXPORT_PDF: 15,
  },
}));

// ✅ 3. Mock Redis
jest.mock("../../src/config/redis", () => ({
  redisClient: { get: jest.fn(), set: jest.fn() },
}));

// ✅ 4. Mock Lesson Graph
jest.mock("../../src/ai/graphs/lessonGraph", () => ({
  lessonGraph: {
    invoke: jest.fn(),
  },
}));

import { lessonService } from "../../src/services/lessonService";
import { lessonGraph } from "../../src/ai/graphs/lessonGraph";
import { Lesson } from "../../src/models/Lesson";
import { creditService } from "../../src/services/creditService";
import { Module } from "../../src/models/Module";
import { Course } from "../../src/models/Course";

// Mock Deps
jest.mock("../../src/models/Lesson");
jest.mock("../../src/models/Module");
jest.mock("../../src/models/Course");
jest.mock("../../src/models/User");
jest.mock("../../src/services/creditService");

jest.mock("../../src/utils/semanticCache", () => ({
  semanticCache: {
    getCachedLesson: jest.fn().mockResolvedValue(null),
    setCachedLesson: jest.fn().mockResolvedValue(true),
  },
}));

describe("LessonService Unit", () => {
  const mockUserId = "user_123";
  const mockLessonId = "lesson_123";

  beforeEach(() => {
    jest.clearAllMocks();
    (creditService.deductCredits as jest.Mock).mockResolvedValue(true);
    (creditService.getBalance as jest.Mock).mockResolvedValue(100);
  });

  describe("generateContent", () => {
    it("should use lessonGraph to generate and save content", async () => {
      // 1. Setup DB Data
      const mockLesson = {
        _id: mockLessonId,
        title: "Test Lesson",
        module: "mod_1",
        content: [],
        save: jest.fn(),
      };
      (Lesson.findById as jest.Mock).mockResolvedValue(mockLesson);
      (Module.findById as jest.Mock).mockResolvedValue({ course: "course_1" });
      (Course.findById as jest.Mock).mockResolvedValue({
        title: "Course Title",
      });

      // 2. Setup Graph Mock
      const mockGraphResult = {
        content: [{ type: "paragraph", text: "Generated Content" }],
        objectives: ["Learn X"],
      };
      (lessonGraph.invoke as jest.Mock).mockResolvedValue(mockGraphResult);

      // 3. Execute
      await lessonService.generateContent(mockLessonId, mockUserId);

      // 4. Verify
      expect(lessonGraph.invoke).toHaveBeenCalled();
      expect(mockLesson.content).toEqual(mockGraphResult.content);
      expect(mockLesson.save).toHaveBeenCalled();
    });
  });

  describe("deductPDFCredits", () => {
    it("should deduct credits and return remaining balance", async () => {
      (creditService.deductCredits as jest.Mock).mockResolvedValue(true);
      (creditService.getBalance as jest.Mock).mockResolvedValue(85);

      const result = await lessonService.deductPDFCredits(mockUserId);

      // ✅ FIX: Verify with literal 15 (mocked value)
      expect(creditService.deductCredits).toHaveBeenCalledWith(mockUserId, 15);
      expect(result.success).toBe(true);
    });
  });
});
