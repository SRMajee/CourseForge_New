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

// ✅ 3. Mock Redis (Config Controller uses it for caching)
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null), // Simulate cache miss initially
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

// ✅ 5. Smart Mock for Auth Middleware
// Behaves like real middleware: checks header exists, otherwise 401
jest.mock("../../src/middleware/authMiddleware", () => ({
  checkJwt: jest.fn((req: any, res: any, next: any) => {
    if (req.headers.authorization === "Bearer valid_token") {
      req.auth = { sub: "auth0|test_user" };
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  }),
}));

// ✅ 6. Import Controller
import { getAppConfig } from "../../src/controllers/configController";
import { checkJwt } from "../../src/middleware/authMiddleware";

// ✅ 7. Setup App
const app = express();
app.use(express.json());

// Route 1: Public Config
app.get("/config", getAppConfig);

// Route 2: Dummy Protected Route
app.get("/api/protected", checkJwt, (req, res) => {
  res.json({ message: "Secret Data" });
});

// Route 3: 404 Handler (Catch-all)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

describe("Global & Misc Routes", () => {
  // ---------------------------------------------------------
  // Test 1: GET /config
  // ---------------------------------------------------------
  describe("GET /config", () => {
    it("should return the correct public configuration", async () => {
      const response = await request(app).get("/config");

      expect(response.status).toBe(200);
      
      // Verify Pricing Structure
      expect(response.body.pricing).toEqual({
        topUp: {
          price: "400",
          credits: "300",
          label: "Small Pack",
        },
        pro: {
          price: "999",
          credits: "1000",
          label: "Pro Plan",
        },
      });

      // Verify Costs
      expect(response.body.costs).toEqual(expect.objectContaining({
        createCourse: 50,
        generateLesson: 35,
      }));
    });
  });

  // ---------------------------------------------------------
  // Test 2: 401 Handler (Protected Routes)
  // ---------------------------------------------------------
  describe("Protected Routes (Auth)", () => {
    it("should return 401 if authorization header is missing", async () => {
      const response = await request(app).get("/api/protected");
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Unauthorized");
    });

    it("should return 200 if valid authorization header is provided", async () => {
      const response = await request(app)
        .get("/api/protected")
        .set("Authorization", "Bearer valid_token");

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Secret Data");
    });
  });

  // ---------------------------------------------------------
  // Test 3: 404 Handler
  // ---------------------------------------------------------
  describe("404 Handler", () => {
    it("should return 404 JSON for non-existent routes", async () => {
      const response = await request(app).get("/api/does-not-exist");

      expect(response.status).toBe(404);
      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body.message).toMatch(/not found/i);
    });
  });
});