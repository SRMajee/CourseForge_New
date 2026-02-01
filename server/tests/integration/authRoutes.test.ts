import request from "supertest";
import express from "express";
import authRoutes from "../../src/routes/authRoutes";
import { authController } from "../../src/controllers/authController";

// 1. Mock the Middleware (Bypass Auth0)
jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: (req: any, res: any, next: any) => {
    req.auth = { sub: "auth0|123456" }; // Fake Auth0 ID
    next();
  },
}));

// 2. Mock the Controller (Focus on Route Logic, not DB Logic)
// In a true "End-to-End" test, you would use a real In-Memory DB here.
// For "Route Integration", mocking the controller is faster/cleaner.
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
    req.user = { _id: "user_123", email: "test@example.com" }; // Fake DB User
    next();
  },
}));

const app = express();
app.use(express.json());
app.use("/auth", authRoutes); // Mount routes like index.ts does

describe("Auth Routes Integration", () => {
  describe("POST /auth/sync", () => {
    it("should allow a valid request and return user data", async () => {
      const response = await request(app)
        .post("/auth/sync")
        .send({ email: "test@example.com" }); // Send payload

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.id).toBe("user_123");

      // Verify controller was called
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

      // Verify controller was called
      expect(authController.updateProfile).toHaveBeenCalled();
    });
  });
});
