import request from "supertest";
import express from "express";
import mongoose from "mongoose";

// ✅ 1. Set Global Timeout
jest.setTimeout(60000);

// ✅ 2. Mock Env
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    MONGO_URI:
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test",
    REDIS_HOST: "redis",
    REDIS_PORT: 6379,
    OPENAI_API_KEY: "sk-mock",
    STRIPE_SECRET_KEY: "sk_test_mock",
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-audience",
    GEMINI_API_KEY: "mock-key",
    GROQ_API_KEY: "mock-key",
    TAVILY_API_KEY: "mock-tavily-key",
    COST_CREATE_COURSE: 50,
    COST_CREATE_COURSE_PRO: 100,
    COST_REGENERATE_COURSE: 25,
    COST_GENERATE_LESSON: 15,
    COST_EXPORT_PDF: 15,
  },
}));

// ✅ 3. Mock Logger (Silence "Insufficient Credits" logs)
jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(), // 👈 Silences controller errors
  warn: jest.fn(),
}));

// ✅ 4. Mock Redis Client
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  },
  redisConnection: {
    on: jest.fn(),
    duplicate: jest.fn(() => ({
      on: jest.fn(),
      connect: jest.fn(),
    })),
  },
}));

// ✅ 5. Mock Dependencies
jest.mock("../../src/services/socketService", () => ({
  socketService: {
    emitToUser: jest.fn(),
    init: jest.fn(),
  },
}));

// ✅ CRITICAL: Mock lessonService
jest.mock("../../src/services/lessonService", () => ({
  lessonService: {
    generateContent: jest.fn(),
    deductPDFCredits: jest.fn(),
    deductModulePDFCredits: jest.fn(),
    deductCoursePDFCredits: jest.fn(),
    getLessonById: jest.fn(),
  },
}));

// ✅ CRITICAL: Mock creditService getUserContext
jest.mock("../../src/services/creditService", () => ({
  creditService: {
    deductCredits: jest.fn().mockResolvedValue(true),
    getBalance: jest.fn().mockResolvedValue(100),
    getUserContext: jest.fn().mockResolvedValue({
      credits: 100,
      isPro: false,
      hasUsedProTrial: false,
    }),
  },
}));

jest.mock("../../src/services/ClarificationService", () => ({
  clarificationService: {
    analyzeTopic: jest.fn().mockResolvedValue({ isAmbiguous: false }),
  },
}));

jest.mock("../../src/queues/courseQueue", () => ({
  courseQueue: { add: jest.fn().mockResolvedValue({ id: "job_123" }) },
}));

// Generate a static valid ID for tests
const mockUserId = new mongoose.Types.ObjectId().toString();

jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: (req: any, res: any, next: any) => {
    req.auth = { payload: { sub: "auth0|test_user" } };
    next();
  },
}));

jest.mock("../../src/middleware/attachUser", () => {
  return {
    attachUser: async (req: any, res: any, next: any) => {
      // Return a user with the VALID ObjectId
      req.user = { _id: mockUserId, email: "test@example.com" };
      next();
    },
  };
});

// Import after mocks
import courseRoutes from "../../src/routes/courseRoutes";
import { lessonService } from "../../src/services/lessonService";

const app = express();
app.use(express.json());
const { checkJwt } = require("../../src/middleware/authMiddleware");
const { attachUser } = require("../../src/middleware/attachUser");
app.use(checkJwt);
app.use(attachUser);
app.use("/courses", courseRoutes);

describe("Course Routes Integration", () => {
  beforeAll(async () => {
    const uri =
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test";
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  // 1. Generate Outline
  describe("POST /courses/outline", () => {
    it("should accept a valid prompt and queue the job", async () => {
      const response = await request(app)
        .post("/courses/outline")
        .send({ topic: "Learn React" });

      expect(response.status).toBe(202);
      expect(response.body.status).toBe("queued");
    });
  });

  // 2. Resume Course
  describe("POST /courses/resume", () => {
    it("should resume a paused job using Redis state", async () => {
      const { redisClient } = require("../../src/config/redis");
      const mockState = JSON.stringify({
        userId: mockUserId,
        topic: "Advanced JS",
        mode: "pro",
      });
      (redisClient.get as jest.Mock).mockResolvedValue(mockState);

      const response = await request(app)
        .post("/courses/resume")
        .send({ jobId: "job_paused_123", answers: ["Yes", "Beginner"] });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("Resumed");
    });
  });

  // 3. Generate Lesson Content
  describe("POST /courses/lessons/:lessonId/generate", () => {
    it("should return the enriched lesson from service", async () => {
      // Mock the Service response
      (lessonService.generateContent as jest.Mock).mockResolvedValue({
        _id: "lesson_123",
        title: "Test Lesson",
        isEnriched: true,
        content: [
          { type: "heading", text: "Generated Heading" },
          { type: "paragraph", text: "Generated Content" },
        ],
      });

      const response = await request(app).post(
        `/courses/lessons/lesson_123/generate`,
      );

      expect(response.status).toBe(200);
      expect(response.body.isEnriched).toBe(true);
      expect(response.body.content[0].text).toBe("Generated Heading");
    });
  });

  // 4. PDF Download (Credit Deduction)
  describe("POST /courses/lessons/:lessonId/pdf", () => {
    it("should return success when service succeeds", async () => {
      // Mock Service Success
      (lessonService.deductPDFCredits as jest.Mock).mockResolvedValue({
        success: true,
        remainingCredits: 85,
      });

      const response = await request(app).post(
        `/courses/lessons/lesson_123/pdf`,
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.remainingCredits).toBe(85);
    });

    it("should return 402 if service throws insufficient credits", async () => {
      // Mock Service Error
      (lessonService.deductPDFCredits as jest.Mock).mockRejectedValue(
        new Error("Insufficient credits"),
      );

      const response = await request(app).post(
        `/courses/lessons/lesson_123/pdf`,
      );

      expect(response.status).toBe(402);
      expect(response.body.message).toContain("Insufficient credits");
    });
  });
});
