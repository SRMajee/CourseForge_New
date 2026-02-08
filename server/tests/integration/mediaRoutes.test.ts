import request from "supertest";
import express from "express";

// ✅ 1. Set Timeout
jest.setTimeout(60000);

// ✅ 2. Mock Environment
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    // Pricing Configs
    PRICE_TOPUP_INR: "400",
    CREDITS_TOPUP_AMOUNT: "300",
    PRICE_PRO_INR: "999",
    CREDITS_PRO_AMOUNT: "1000",
    // Cost Configs
    COST_CREATE_COURSE: "50",
    COST_GENERATE_LESSON: "35",
    COST_GENERATE_AUDIO: "15",
    COST_EXPORT_PDF: "15",
  },
}));

// ✅ 3. Mock Redis
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null), 
    set: jest.fn(),
  },
}));

// ✅ 4. Mock Stripe/Credits Constants
jest.mock("../../src/config/stripe", () => ({
  CREDIT_PACKS: {
    TOP_UP_SMALL: { name: "Small Pack" },
  },
  SUBSCRIPTION_PLANS: {
    PRO_MONTHLY: { name: "Pro Plan" },
  },
}));

jest.mock("../../src/config/credits", () => ({
  CREDIT_COSTS: {
    CREATE_COURSE: 50,
    GENERATE_LESSON: 35,
    GENERATE_AUDIO: 15,
    EXPORT_PDF: 15,
  },
  COST_MENU: [{ label: "Course", cost: 50 }],
}));

// ✅ 5. Mock Auth Middleware
jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: jest.fn((req: any, res: any, next: any) => {
    if (req.headers.authorization === "Bearer valid_token") {
      req.auth = { sub: "auth0|test_user" };
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  }),
}));

import { getAppConfig } from "../../src/controllers/configController";
import { checkJwt } from "../../src/middleware/authMiddleware";

const app = express();
app.use(express.json());

app.get("/config", getAppConfig);
app.get("/api/protected", checkJwt, (req, res) => {
  res.json({ message: "Secret Data" });
});
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

describe("Global & Misc Routes", () => {
  describe("GET /config", () => {
    it("should return the correct public configuration", async () => {
      const response = await request(app).get("/config");

      expect(response.status).toBe(200);
      expect(response.body.costs).toEqual(expect.objectContaining({
        createCourse: 50,
        generateLesson: 35,
      }));
    });
  });

  describe("Protected Routes", () => {
    it("should return 401 if token missing", async () => {
      const response = await request(app).get("/api/protected");
      expect(response.status).toBe(401);
    });

    it("should return 200 if token valid", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer valid_token");
      expect(response.status).toBe(200);
    });
  });

  describe("404 Handler", () => {
    it("should return 404 JSON for non-existent routes", async () => {
      const response = await request(app).get("/api/does-not-exist");
      expect(response.status).toBe(404);
      expect(response.body.message).toMatch(/not found/i);
    });
  });
});