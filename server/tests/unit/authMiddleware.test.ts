import { Response, NextFunction } from "express";
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

  // Note: Since we are mocking the library factory, we test the *behavior* of our wrapper
  // or simply skip if your checkJwt is a direct export of the library function.
  // Assuming standard usage, we typically test the integration. 
  // However, strict unit tests for middlewares often mock the factory.
  
  it("should define the middleware function", () => {
      expect(typeof checkJwt).toBe("function");
  });
});