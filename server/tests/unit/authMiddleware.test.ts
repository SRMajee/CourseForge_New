import { Response, NextFunction } from "express";

// ✅ 1. Mock Env FIRST (Prevents process.exit(1) crash)
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    AUTH0_DOMAIN: "test.auth0.com",
    AUTH0_AUDIENCE: "test-audience",
    AUTH0_ISSUER_BASE_URL: "https://test.auth0.com",
  },
}));

// ✅ 2. Mock Redis (Prevent connection errors just in case)
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

// ✅ 3. Import Dependencies (AFTER Mocks)
import { checkJwt } from "../../src/middleware/authMiddleware";

// Mock the external library express-oauth2-jwt-bearer
jest.mock("express-oauth2-jwt-bearer", () => ({
  auth: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => {
    // Simulate library behavior
    if (req.headers.authorization === "Bearer valid_token") {
        req.auth = { payload: { sub: "auth0|test" } };
        return next();
    }
    const error: any = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }),
}));

describe("Middleware: checkJwt", () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  it("should define the middleware function", () => {
      expect(typeof checkJwt).toBe("function");
  });
});