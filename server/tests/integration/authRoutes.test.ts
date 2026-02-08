import request from "supertest";
import express from "express";

// ✅ 1. Mock Env
jest.mock("../../src/config/env", () => ({
  env: {
    PORT: 5000,
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-audience",
  },
}));

// ✅ 2. Mock Redis (Absolute Top Priority)
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  },
  redisConnection: {
    on: jest.fn(),
  },
}));

// ✅ 3. Mock Middleware
jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: (req: any, res: any, next: any) => {
    req.auth = { sub: "auth0|123456" };
    next();
  },
}));

jest.mock("../../src/middleware/attachUser", () => ({
  attachUser: (req: any, res: any, next: any) => {
    req.user = { _id: "user_123", email: "test@example.com" };
    next();
  },
}));

// ✅ 4. Mock Controller Logic
jest.mock("../../src/controllers/authController", () => ({
  authController: {
    syncUser: jest.fn((req, res) =>
      res.status(200).json({ success: true, user: { id: "user_123" } }),
    ),
    updateProfile: jest.fn((req, res) =>
      res.status(200).json({ success: true, updated: req.body }),
    ),
  },
}));

// 5. Imports AFTER Mocks
import authRoutes from "../../src/routes/authRoutes";
import { authController } from "../../src/controllers/authController";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Routes Integration", () => {
  describe("POST /auth/sync", () => {
    it("should return user data", async () => {
      const response = await request(app)
        .post("/auth/sync")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(200);
      expect(authController.syncUser).toHaveBeenCalled();
    });
  });

  describe("PATCH /auth/profile", () => {
    it("should update profile", async () => {
      const updateData = { name: "New Name" };
      const response = await request(app)
        .patch("/auth/profile")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(authController.updateProfile).toHaveBeenCalled();
    });
  });
});
