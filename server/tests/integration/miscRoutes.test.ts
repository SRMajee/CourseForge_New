import request from "supertest";
import express from "express";
import mongoose from "mongoose";

// ✅ 1. Set Timeout
jest.setTimeout(60000);

// ✅ 2. Mock Environment
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    MONGO_URI:
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test",
    YOUTUBE_API_KEY: "mock-yt-key",
    OPENAI_API_KEY: "mock-openai-key",
    GEMINI_API_KEY: "mock-gemini-key",
    GROQ_API_KEY: "mock-groq-key",
    CLOUDINARY_CLOUD_NAME: "mock-cloud",
    CLOUDINARY_API_KEY: "mock-key",
    CLOUDINARY_API_SECRET: "mock-secret",
    COST_GENERATE_AUDIO: 15,
    STRIPE_SECRET_KEY: "sk_test_mock",
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-audience",
  },
}));

// ✅ 3. Mock Redis (Support Lua for Credit Deduction)
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    eval: jest.fn().mockResolvedValue([1, 85]), // Success by default
  },
}));

// ✅ 4. Mock External Services
jest.mock("../../src/services/youtubeService", () => ({
  youtubeService: {
    searchVideo: jest.fn().mockResolvedValue({
      videoId: "vid_123",
      title: "Learn React",
      thumbnail: "http://thumb.jpg",
      channel: "React Dev",
    }),
  },
}));

// Mock Language Service (Audio Gen)
jest.mock("../../src/services/languageService", () => ({
  languageService: {
    generateScript: jest.fn().mockResolvedValue("Mock Audio Script"),
    generateAudio: jest.fn().mockResolvedValue(Buffer.from("Mock Audio")),
    uploadAudioToCloudinary: jest.fn().mockResolvedValue("https://cdn.audio/1.mp3"),
  },
  SUPPORTED_LANGUAGES: {
    en: { label: "English", ttsCode: "en" },
    hinglish: { label: "Hinglish", ttsCode: "hi" },
  },
}));

jest.mock("../../src/services/socketService", () => ({
  socketService: {
    emitToUser: jest.fn(),
  },
}));

// Mock Middleware
jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: (req: any, res: any, next: any) => {
    req.auth = { payload: { sub: "auth0|test_user" } };
    next();
  },
}));

jest.mock("../../src/middleware/attachUser", () => {
  return {
    attachUser: async (req: any, res: any, next: any) => {
      try {
        const { User } = require("../../src/models/User");
        const user = await User.findOne({ auth0Id: "auth0|test_user" });
        if (user) req.user = user;
        next();
      } catch (err) {
        next(err);
      }
    },
  };
});

import mediaRoutes from "../../src/routes/mediaRoutes";
import { User } from "../../src/models/User";
import { Lesson } from "../../src/models/Lesson";
import { Module } from "../../src/models/Module";
import { Course } from "../../src/models/Course";
import { attachUser } from "../../src/middleware/attachUser";
import { checkJwt } from "../../src/middleware/authMiddleware";

const app = express();
app.use(express.json());
app.use(checkJwt);
app.use(attachUser);
app.use("/media", mediaRoutes);

describe("Media Routes Integration", () => {
  let userId: string;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test";
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  }, 60000);

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

    const user = await User.create({
      auth0Id: "auth0|test_user",
      email: "test@media.com",
      credits: 100,
      planType: "free",
    });
    userId = user._id.toString();
  });

  describe("GET /media/youtube", () => {
    it("should return video details", async () => {
      const response = await request(app)
        .get("/media/youtube")
        .query({ q: "React" });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Learn React");
    });
  });

  describe("POST /media/audio/:lessonId", () => {
    it("should generate audio, deduct credits, and return URL", async () => {
      // 1. Setup DB
      const course = await Course.create({ title: "C", description: "D", userId, modules: [] });
      const module = await Module.create({ title: "M", course: course._id, lessons: [] });
      const lesson = await Lesson.create({
        title: "Audio Lesson",
        module: module._id,
        content: [{ type: "paragraph", text: "Speak this text." }],
      });

      // 2. Call API
      const response = await request(app).post(`/media/audio/${lesson._id}`);

      // 3. Assertions
      expect(response.status).toBe(200);
      expect(response.body.audioUrl).toBe("https://cdn.audio/1.mp3");
      expect(response.body.creditsDeducted).toBe(15);

      // 4. Verify DB
      const updatedLesson = await Lesson.findById(lesson._id);
      expect(updatedLesson?.audioUrls?.hinglish).toBe("https://cdn.audio/1.mp3");
    });
  });
});