import request from "supertest";
import express from "express";
import mongoose from "mongoose";

// ✅ 1. Set Timeout for Docker
jest.setTimeout(60000);

// ✅ 2. Mock Env
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    MONGO_URI:
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test",
    STRIPE_SECRET_KEY: "sk_test_mock",
    STRIPE_WEBHOOK_SECRET: "whsec_mock",
    CLIENT_URL: "http://localhost:3000",
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-audience",
  },
}));

// ✅ 3. Mock Stripe Config & SDK
const mockStripe = {
  checkout: {
    sessions: {
      create: jest
        .fn()
        .mockResolvedValue({ url: "https://stripe.com/mock-session" }),
    },
  },
  billingPortal: {
    sessions: {
      create: jest
        .fn()
        .mockResolvedValue({ url: "https://billing.stripe.com/mock-portal" }),
    },
  },
  subscriptions: {
    retrieve: jest.fn().mockResolvedValue({
      status: "active",
      current_period_end: 1735689600, // Jan 1 2025
      default_payment_method: "pm_123",
      cancel_at_period_end: false,
    }),
    update: jest.fn().mockImplementation((id, params) => ({
      id,
      ...params,
      current_period_end: 1735689600,
    })),
  },
  paymentMethods: {
    retrieve: jest.fn().mockResolvedValue({
      card: { last4: "4242" },
    }),
  },
};

jest.mock("../../src/config/stripe", () => ({
  stripe: mockStripe,
  CREDIT_PACKS: {
    BASIC: { id: "pack_basic", priceId: "price_123", credits: 50 },
  },
  SUBSCRIPTION_PLANS: {
    PRO: { id: "plan_pro", priceId: "price_pro", credits: 1000 },
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
      const { User } = require("../../src/models/User");
      const user = await User.findOne({ auth0Id: "auth0|test_user" });
      if (user) req.user = user;
      next();
    },
  };
});

// ✅ 5. Import Dependencies
import paymentRoutes from "../../src/routes/paymentRoutes";
import subscriptionRoutes from "../../src/routes/subscriptionRoutes";
import { User } from "../../src/models/User";
import { attachUser } from "../../src/middleware/attachUser";
import { checkJwt } from "../../src/middleware/authMiddleware";

// ✅ 6. Setup App
const app = express();
app.use(express.json());
app.use(checkJwt);
app.use(attachUser);
app.use("/payment", paymentRoutes);
app.use("/subscription", subscriptionRoutes);

describe("Payment & Subscription Integration", () => {
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
    await User.deleteMany({});

    // Create Test User with Subscription info for update tests
    const user = await User.create({
      auth0Id: "auth0|test_user",
      email: "test@pay.com",
      credits: 50,
      planType: "free",
      stripeCustomerId: "cus_123",
      subscriptionId: "sub_123", // Key for subscription tests
    });
    userId = user._id.toString();
  });

  // ---------------------------------------------------------
  // Test 1: POST /payment/checkout
  // ---------------------------------------------------------
  describe("POST /payment/checkout", () => {
    it("should return a valid Stripe Session URL for Credit Pack", async () => {
      const response = await request(app)
        .post("/payment/checkout")
        .send({ packId: "pack_basic" });

      expect(response.status).toBe(200);
      expect(response.body.url).toBe("https://stripe.com/mock-session");
      // Verify mock was called with correct metadata
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ type: "TOP_UP" }),
        }),
      );
    });

    it("should return a valid Stripe Session URL for Subscription", async () => {
      const response = await request(app)
        .post("/payment/checkout")
        .send({ planId: "plan_pro" });

      expect(response.status).toBe(200);
      expect(response.body.url).toBe("https://stripe.com/mock-session");
    });

    it("should return 400 for invalid pack/plan", async () => {
      const response = await request(app)
        .post("/payment/checkout")
        .send({ packId: "invalid_pack" });

      expect(response.status).toBe(400);
    });
  });

  // ---------------------------------------------------------
  // Test 2: GET /subscription/current
  // ---------------------------------------------------------
  describe("GET /subscription/current", () => {
    it("should return subscription details for active user", async () => {
      const response = await request(app).get("/subscription/current");

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("active");
      expect(response.body.cardLast4).toBe("4242");
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith("sub_123");
    });

    it("should return 404 if user has no subscriptionId", async () => {
      // Remove subscriptionId from DB
      await User.findByIdAndUpdate(userId, { subscriptionId: null });

      const response = await request(app).get("/subscription/current");
      expect(response.status).toBe(404);
    });
  });

  // ---------------------------------------------------------
  // Test 3: POST /subscription/portal
  // ---------------------------------------------------------
  describe("POST /subscription/portal", () => {
    it("should return a portal URL for existing customer", async () => {
      const response = await request(app).post("/subscription/portal");

      expect(response.status).toBe(200);
      expect(response.body.url).toBe("https://billing.stripe.com/mock-portal");
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: "cus_123" }),
      );
    });
  });

  // ---------------------------------------------------------
  // Test 4: POST /subscription/cancel
  // ---------------------------------------------------------
  describe("POST /subscription/cancel", () => {
    it("should cancel subscription at period end", async () => {
      const response = await request(app).post("/subscription/cancel");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("cancelled successfully");

      // Verify Stripe API call
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: true,
      });
    });
  });
  describe("POST /subscription/resume", () => {
    it("should resume a cancelled subscription", async () => {
      // Mock user with sub
      const user = await User.findOne({ email: "test@pay.com" });
      user!.subscriptionId = "sub_123";
      await user!.save();

      const response = await request(app).post("/subscription/resume");

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("resumed successfully");

      // Verify Stripe Mock
      const { stripe } = require("../../src/config/stripe");
      expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_123", {
        cancel_at_period_end: false,
      });
    });
  });
});
