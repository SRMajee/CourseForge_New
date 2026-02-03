import { Request, Response } from "express";
import mongoose from "mongoose";
import { handleWebhook } from "../../src/controllers/paymentController";
import { User } from "../../src/models/User";
import { creditService } from "../../src/services/creditService";

jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
  },
  redisConnection: {
    on: jest.fn(),
  },
}));
// ✅ 1. Mock External Dependencies
jest.mock("../../src/config/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn((body) => body), // Simply pass body through as event
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({ current_period_end: 1735689600 }),
    },
  },
  CREDIT_PACKS: {},
  SUBSCRIPTION_PLANS: {},
}));

jest.mock("../../src/config/env", () => ({
  env: { STRIPE_WEBHOOK_SECRET: "whsec_mock" },
}));

// Mock creditService to spy on calls
jest.mock("../../src/services/creditService", () => ({
  creditService: {
    addCredits: jest.fn(),
  },
}));

jest.mock("../../src/utils/logger"); // Silence logs

describe("Webhook Handler (Unit)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let userId: string;

  beforeAll(async () => {
    const uri =
      process.env.MONGO_URI || "mongodb://mongo:27017/courseforge_test";
    try {
      await mongoose.connect(uri);
    } catch (e) {}
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    const user = await User.create({
      auth0Id: "auth0|webhook_user",
      email: "webhook@test.com",
      credits: 10,
      planType: "free",
      stripeCustomerId: "cus_test_123",
    });
    userId = user._id.toString();

    // Mock Express Request/Response
    req = {
      headers: { "stripe-signature": "dummy_sig" },
      body: {}, // Will be populated in tests
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------
  // Case A: One-Time Top Up
  // ---------------------------------------------------------
  it("should add credits on checkout.session.completed (TOP_UP)", async () => {
    req.body = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: userId, type: "TOP_UP", credits: "50" },
        },
      },
    };

    await handleWebhook(req as Request, res as Response);

    expect(creditService.addCredits).toHaveBeenCalledWith(userId, 50);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  // ---------------------------------------------------------
  // Case B: New Subscription Upgrade
  // ---------------------------------------------------------
  it("should upgrade plan on checkout.session.completed (SUBSCRIPTION)", async () => {
    req.body = {
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: userId, type: "SUBSCRIPTION" },
          subscription: "sub_new_123",
          customer: "cus_new_123",
        },
      },
    };

    await handleWebhook(req as Request, res as Response);

    // Verify DB Updates
    const updatedUser = await User.findById(userId);
    expect(updatedUser?.planType).toBe("PRO");
    expect(updatedUser?.subscriptionStatus).toBe("active");
    expect(updatedUser?.stripeCustomerId).toBe("cus_new_123");

    // Verify Credits Rollover (1000 added)
    expect(creditService.addCredits).toHaveBeenCalledWith(userId, 1000);
  });

  // ---------------------------------------------------------
  // Case C: Monthly Renewal
  // ---------------------------------------------------------
  it("should renew credits on invoice.payment_succeeded (Renewal)", async () => {
    req.body = {
      type: "invoice.payment_succeeded",
      data: {
        object: {
          customer: "cus_test_123", // Matches existing user
          billing_reason: "subscription_cycle",
          lines: {
            data: [{ period: { end: 1735689600 } }],
          },
        },
      },
    };

    await handleWebhook(req as Request, res as Response);

    // Verify DB Date Update
    const updatedUser = await User.findById(userId);
    expect(updatedUser?.subscriptionStatus).toBe("active");
    // Date comparison depends on exact timestamp from mock
    expect(updatedUser?.currentPeriodEnd).toBeDefined();

    // Verify Credits Addition
    expect(creditService.addCredits).toHaveBeenCalledWith(userId, 1000);
  });
  it("should return 400 for invalid signature", async () => {
    // Mock Stripe signature verification failure
    const { stripe } = require("../../src/config/stripe");
    stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error("Invalid signature");
    });

    req.headers = { "stripe-signature": "bad_sig" };
    req.body = "raw_body";

    await handleWebhook(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should ignore unknown events safely", async () => {
    req.body = { type: "unknown.event", data: {} };

    await handleWebhook(req as Request, res as Response);

    expect(res.json).toHaveBeenCalledWith({ received: true });
    // Ensure no credits were added
    expect(creditService.addCredits).not.toHaveBeenCalled();
  });
});
