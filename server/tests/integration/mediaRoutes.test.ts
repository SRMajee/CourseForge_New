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

// ✅ 3. Mock External Services
jest.mock("../../src/services/youtubeService", () => ({
  youtubeService: {
    searchVideo: jest.fn().mockResolvedValue({
      videoId: "vid_123",
      title: "Learn React in 10 Min",
      thumbnail: "http://thumb.jpg",
      channel: "React Dev",
    }),
    searchVideos: jest.fn().mockResolvedValue([]),
  },
}));

// ✅ Mock Language Service (Crucial for Audio Test)
jest.mock("../../src/services/languageService", () => ({
  languageService: {
    generateScript: jest.fn().mockResolvedValue("Mock Audio Script"),
    generateAudio: jest
      .fn()
      .mockResolvedValue(Buffer.from("Mock Audio Buffer")),
    uploadAudioToCloudinary: jest
      .fn()
      .mockResolvedValue("https://res.cloudinary.com/mock-url.mp3"),
  },
  SUPPORTED_LANGUAGES: {
    en: { label: "English", ttsCode: "en" },
    hinglish: { label: "Hinglish", ttsCode: "hi" },
    hi: { label: "Hindi", ttsCode: "hi" },
  },
}));

// ✅ Mock Credit Service (Avoids Redis Complexity)
jest.mock("../../src/services/creditService", () => ({
  creditService: {
    deductCredits: jest.fn().mockResolvedValue(true),
    addCredits: jest.fn(),
    getBalance: jest.fn().mockResolvedValue(100),
  },
}));

jest.mock("../../src/services/ModelGateway", () => ({
  modelGateway: {
    generateAudio: jest
      .fn()
      .mockResolvedValue(Buffer.from("mock_audio_buffer")),
  },
}));

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn((options, cb) => {
        if (cb) {
          cb(null, {
            secure_url:
              "https://res.cloudinary.com/demo/video/upload/v1/mock_audio.mp3",
            public_id: "audio_123",
          });
        }
        const { Writable } = require("stream");
        const stream = new Writable();
        stream._write = (chunk: any, enc: any, next: any) => next();
        return stream;
      }),
    },
  },
}));

jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
  },
}));

jest.mock("../../src/services/socketService", () => ({
  socketService: {
    emit: jest.fn(),
    io: { to: jest.fn().mockReturnThis(), emit: jest.fn() },
    emitToUser: jest.fn(),
  },
}));

jest.mock("../../src/queues/courseQueue", () => ({
  courseQueue: {
    add: jest.fn().mockResolvedValue({ id: "job_mock" }),
  },
}));

// ✅ 4. Mock Middleware
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

// ✅ 5. Import Dependencies
import mediaRoutes from "../../src/routes/mediaRoutes";
import { User } from "../../src/models/User";
import { Lesson } from "../../src/models/Lesson";
import { Module } from "../../src/models/Module";
import { Course } from "../../src/models/Course";
import { youtubeService } from "../../src/services/youtubeService";
import { attachUser } from "../../src/middleware/attachUser";
import { checkJwt } from "../../src/middleware/authMiddleware";

// ✅ 6. Setup App
const app = express();
app.use(express.json());
app.use(checkJwt);
app.use(attachUser);
app.use("/media", mediaRoutes);

describe("Media Routes Integration", () => {
  let userId: string;

  beforeAll(async () => {
    const uri =
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test";
    try {
      await mongoose.connect(uri);
    } catch (e) {
      console.error("DB Connect Error:", e);
    }
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

  // ---------------------------------------------------------
  // Test 1: GET /media/youtube
  // ---------------------------------------------------------
  describe("GET /media/youtube", () => {
    it("should return a list of video objects using the mocked service", async () => {
      const response = await request(app)
        .get("/media/youtube")
        .query({ q: "React Tutorial" });

      expect(response.status).toBe(200);
      // Our mock returns a single object now, controller might wrap or return as is
      // Based on controller logic: res.json(videoData)
      expect(response.body.title).toBe("Learn React in 10 Min");

      expect(youtubeService.searchVideo).toHaveBeenCalled();
    });

    it("should return 400 if query is missing", async () => {
      const response = await request(app).get("/media/youtube");
      expect(response.status).toBe(400);
    });
  });

  // ---------------------------------------------------------
  // Test 2: POST /media/audio/:lessonId
  // ---------------------------------------------------------
  describe("POST /media/audio/:lessonId", () => {
    it("should generate audio, save to lesson, and return URL", async () => {
      // 1. Setup Data
      const course = await Course.create({
        title: "C",
        description: "D",
        userId,
        tags: [],
        modules: [],
      });
      const module = await Module.create({
        title: "M",
        course: course._id,
        lessons: [],
      });
      const lesson = await Lesson.create({
        title: "Test Lesson",
        module: module._id,
        content: [
          { type: "paragraph", text: "This is sample text for audio." },
        ],
      });

      // 2. Call Endpoint
      const response = await request(app).post(`/media/audio/${lesson._id}`);

      // 3. Assertions
      expect(response.status).toBe(200);
      expect(response.body.audioUrl).toContain("cloudinary.com");

      // 4. Verify DB Update
      const updatedLesson = await Lesson.findById(lesson._id);
      const hasAudio =
        updatedLesson?.audioUrls?.["hinglish"] ||
        (updatedLesson as any).audioUrls?.hinglish;
      expect(hasAudio).toBeTruthy();
    });

    it("should return 404 if lesson not found", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).post(`/media/audio/${fakeId}`);
      expect(response.status).toBe(404);
    });
  });
});
