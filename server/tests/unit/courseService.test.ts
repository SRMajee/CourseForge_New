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

// ✅ 2. Mock Logger (Silence expected errors)
jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(), // 👈 Silences "Generation Failed" logs in console
  warn: jest.fn(),
}));

// ✅ 3. Mock Redis Client
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
    on: jest.fn(),
    eval: jest.fn().mockResolvedValue([1, 100]),
  },
}));

// ✅ 4. Mock Mongoose (Session Logic & Types)
jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  return {
    ...actual,
    startSession: jest.fn().mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
    }),
    Types: {
      ObjectId: actual.Types.ObjectId,
    },
  };
});

// ✅ 5. Robust Mock for Models
const mockFindById = jest.fn();
const mockFindOne = jest.fn();
const mockInsertMany = jest.fn();
const mockGlobalSave = jest.fn();

// Factory to create Model mocks where instances have a working .save()
const createMockModel = (name: string) => {
  const MockModel: any = jest.fn().mockImplementation((data) => {
    // This represents the "Document" instance
    const doc: any = {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      modules: [], // Default for Course
      lessons: [], // Default for Module
    };

    // Define .save() to return THE SAME DOC (Promise), simulating Mongoose behavior
    doc.save = jest.fn().mockImplementation(async () => {
      mockGlobalSave(data); // Track that save was called
      return doc;
    });

    return doc;
  });

  // Static methods
  MockModel.findById = mockFindById;
  MockModel.findOne = mockFindOne;
  MockModel.insertMany = mockInsertMany;
  return MockModel;
};

const MockCourse = createMockModel("Course");
const MockModule = createMockModel("Module");
const MockLesson = createMockModel("Lesson");
const MockUser = createMockModel("User");

jest.mock("../../src/models/Course", () => ({ Course: MockCourse }));
jest.mock("../../src/models/Module", () => ({ Module: MockModule }));
jest.mock("../../src/models/Lesson", () => ({ Lesson: MockLesson }));
jest.mock("../../src/models/User", () => ({ User: MockUser }));

// ✅ 6. Mock Graph
jest.mock("../../src/ai/graphs/courseGraph", () => ({
  courseGraph: {
    invoke: jest.fn(),
  },
}));

import { courseService } from "../../src/services/courseService";
import { creditService } from "../../src/services/creditService";
import { imageService } from "../../src/services/imageService";
import { courseGraph } from "../../src/ai/graphs/courseGraph";

jest.mock("../../src/services/creditService");
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

describe("CourseService Unit", () => {
  const userId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();

    // Smart FindById Mock
    mockFindById.mockImplementation((id) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        session: jest.fn().mockReturnThis(),
        then: (resolve: any) => {
          // Default to User structure
          resolve({
            _id: userId,
            planType: "FREE",
            credits: 100,
            save: jest.fn(),
            // Course fields safe defaults
            title: "AI Course",
            modules: [{ title: "Intro", lessons: [] }],
          });
        },
      };
      return chain;
    });

    // Mock InsertMany to return objects with .save()
    mockInsertMany.mockResolvedValue([
      { _id: "les_1", save: jest.fn() },
      { _id: "les_2", save: jest.fn() },
    ]);

    (creditService.deductCredits as jest.Mock).mockResolvedValue(true);
    (imageService.getCourseThumbnail as jest.Mock).mockResolvedValue(
      "http://img.com",
    );
  });

  describe("generateCourse", () => {
    it("should invoke courseGraph and save result", async () => {
      // 1. Mock Graph Result
      const mockGraphState = {
        draft: {
          title: "AI Course",
          description: "Learn AI",
          tags: ["AI"],
          modules: [
            {
              title: "Intro",
              lessons: [{ title: "Lesson 1" }, { title: "Lesson 2" }],
            },
          ],
        },
      };

      (courseGraph.invoke as jest.Mock).mockResolvedValue(mockGraphState);

      const result = await courseService.generateCourse(userId, "Topic", {
        mode: "standard",
        threadId: "test_thread_123",
      });

      // ✅ Verify Graph
      expect(courseGraph.invoke).toHaveBeenCalledWith(
        expect.objectContaining({ topic: "Topic" }),
        expect.objectContaining({
          configurable: { thread_id: "test_thread_123" },
        }),
      );

      // ✅ Verify DB Transaction Usage
      expect(mongoose.startSession).toHaveBeenCalled();

      // We check our global tracker or the class mock
      expect(MockCourse).toHaveBeenCalled();
      expect(MockModule).toHaveBeenCalled();

      // Verify InsertMany called for lessons
      expect(mockInsertMany).toHaveBeenCalled();

      expect(result).toBeDefined();
    });

    it("should throw if graph returns no draft", async () => {
      (courseGraph.invoke as jest.Mock).mockResolvedValue({ draft: null });

      // This will log an error in courseService, but our mock logger catches it
      await expect(
        courseService.generateCourse(userId, "Topic"),
      ).rejects.toThrow("AI failed to generate a valid course draft");

      expect(creditService.addCredits).toHaveBeenCalled();
    });
  });
});
