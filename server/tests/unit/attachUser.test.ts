import { attachUser } from "../../src/middleware/attachUser";
import { User } from "../../src/models/User";
import { Response, NextFunction } from "express";

// Mock Mongoose User Model
jest.mock("../../src/models/User");

describe("Middleware: attachUser", () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      // Structure matches express-oauth2-jwt-bearer
      auth: {
        payload: {
          sub: "auth0|12345",
        },
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should attach user to req.user if found in DB", async () => {
    // Setup Mock: Database returns a user
    const mockDbUser = { _id: "db_id_123", email: "test@test.com" };
    (User.findOne as jest.Mock).mockResolvedValue(mockDbUser);

    await attachUser(req, res, next);

    expect(User.findOne).toHaveBeenCalledWith({ auth0Id: "auth0|12345" });
    expect(req.user).toEqual(mockDbUser);
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if user is not found in DB", async () => {
    // Setup Mock: Database returns null
    (User.findOne as jest.Mock).mockResolvedValue(null);

    await attachUser(req, res, next);

    expect(User.findOne).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    // ✅ FIX: Match the actual error message from your middleware
    expect(res.json).toHaveBeenCalledWith({
      message: "User not synced",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
