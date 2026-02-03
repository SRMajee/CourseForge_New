import mongoose from "mongoose";

// ✅ 1. Mock Env FIRST (Prevents process.exit(1) from Zod validation)
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    // API Keys
    OPENAI_API_KEY: "sk-mock",
    STRIPE_SECRET_KEY: "sk_test_mock",
    GEMINI_API_KEY: "mock",
    GROQ_API_KEY: "mock",
    TAVILY_API_KEY: "mock-key",
    // Costs
    COST_CREATE_COURSE: 50,
    COST_GENERATE_LESSON: 35,
    COST_GENERATE_AUDIO: 15,
    COST_EXPORT_PDF: 15,
  },
}));

// ✅ 2. Mock Redis (Prevents connection errors)
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  },
  redisConnection: {
    on: jest.fn(),
    quit: jest.fn(),
  },
}));

// ✅ 3. Import Dependencies (After mocks)
import { lessonService } from "../../src/services/lessonService";
import { Lesson } from "../../src/models/Lesson";
import { creditService } from "../../src/services/creditService";
import { User } from "../../src/models/User";

// ✅ 4. Mock Other Dependencies
jest.mock("../../src/models/Lesson");
jest.mock("../../src/models/User");
jest.mock("../../src/services/creditService");
jest.mock("../../src/services/ModelGateway");
jest.mock("../../src/services/ResearchService");
jest.mock("../../src/utils/semanticCache", () => ({
  semanticCache: { getCachedLesson: jest.fn(), setCachedLesson: jest.fn() },
}));

describe("LessonService Unit Tests", () => {
  const mockLessonId = "lesson_123";
  const mockUserId = "user_123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Update Code Block
  describe("updateCodeBlock", () => {
    it("should update code and output for valid index", async () => {
      const mockLesson = {
        _id: mockLessonId,
        content: [{ type: "code", code: "old", output: "old" }],
      };
      (Lesson.findById as jest.Mock).mockResolvedValue(mockLesson);
      (Lesson.updateOne as jest.Mock).mockResolvedValue({ modifiedCount: 1 });

      await lessonService.updateCodeBlock(
        mockLessonId,
        mockUserId,
        0,
        "new code",
        "new output",
      );

      expect(Lesson.updateOne).toHaveBeenCalledWith(
        { _id: mockLessonId },
        {
          $set: {
            "content.0.code": "new code",
            "content.0.output": "new output",
          },
        },
      );
    });

    it("should throw error for invalid block index", async () => {
      const mockLesson = { _id: mockLessonId, content: [] }; // Empty content
      (Lesson.findById as jest.Mock).mockResolvedValue(mockLesson);

      await expect(
        lessonService.updateCodeBlock(mockLessonId, mockUserId, 5, "code"),
      ).rejects.toThrow("Invalid block index");
    });
  });

  // 2. PDF Credits
  describe("deductPDFCredits", () => {
    it("should deduct credits successfully", async () => {
      (creditService.deductCredits as jest.Mock).mockResolvedValue(true);
      (creditService.getBalance as jest.Mock).mockResolvedValue(85);

      const result = await lessonService.deductPDFCredits(mockUserId);

      expect(creditService.deductCredits).toHaveBeenCalledWith(mockUserId, 15); // Default PDF cost
      expect(result.success).toBe(true);
    });

    it("should throw error if insufficient credits", async () => {
      (creditService.deductCredits as jest.Mock).mockResolvedValue(false);

      await expect(lessonService.deductPDFCredits(mockUserId)).rejects.toThrow(
        "Insufficient credits",
      );
    });
  });

  // 3. Generation Idempotency
  describe("generateContent", () => {
    it("should return existing lesson if already enriched (Idempotency)", async () => {
      const enrichedLesson = { isEnriched: true, content: ["stuff"] };
      (Lesson.findById as jest.Mock).mockResolvedValue(enrichedLesson);

      const result = await lessonService.generateContent(
        mockLessonId,
        mockUserId,
      );

      expect(result).toEqual(enrichedLesson);
      expect(creditService.deductCredits).not.toHaveBeenCalled(); // No charge
    });
  });
});
