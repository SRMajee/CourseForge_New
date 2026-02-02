import request from "supertest";
import express from "express";

// ✅ CRITICAL: Mock env first
jest.mock("../../src/config/env", () => ({
  env: {
    PORT: 5000,
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-audience",
  },
}));

import authRoutes from "../../src/routes/authRoutes";
import { authController } from "../../src/controllers/authController";

// 1. Mock the Middleware
jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: (req: any, res: any, next: any) => {
    req.auth = { sub: "auth0|123456" };
    next();
  },
}));

// 2. Mock the Controller
jest.mock("../../src/controllers/authController", () => ({
  authController: {
    syncUser: jest.fn((req, res) =>
      res
        .status(200)
        .json({
          success: true,
          user: { id: "user_123", email: "test@example.com" },
        }),
    ),
    updateProfile: jest.fn((req, res) =>
      res.status(200).json({ success: true, updated: req.body }),
    ),
  },
}));

// 3. Mock attachUser Middleware
jest.mock("../../src/middleware/attachUser", () => ({
  attachUser: (req: any, res: any, next: any) => {
    req.user = { _id: "user_123", email: "test@example.com" };
    next();
  },
}));

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Routes Integration", () => {
  describe("POST /auth/sync", () => {
    it("should allow a valid request and return user data", async () => {
      const response = await request(app)
        .post("/auth/sync")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe("user_123");
      expect(authController.syncUser).toHaveBeenCalled();
    });
  });

  describe("PATCH /auth/profile", () => {
    it("should update profile and return 200", async () => {
      const updateData = { name: "New Name", bio: "Developer" };

      const response = await request(app)
        .patch("/auth/profile")
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.updated).toEqual(
        expect.objectContaining(updateData),
      );
      expect(authController.updateProfile).toHaveBeenCalled();
    });
  });
});