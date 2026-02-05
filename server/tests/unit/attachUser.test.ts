import { attachUser } from "../../src/middleware/attachUser";
import { User } from "../../src/models/User";
import { Response, NextFunction } from "express";
import { redisClient } from "../../src/config/redis";

// Mock Mongoose User Model
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    REDIS_HOST: "localhost",
    REDIS_PORT: 6379,
  },
}));
jest.mock("../../src/models/User");

// Mock Redis (since attachUser now checks Redis first)
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    setex: jest.fn(),
  },
}));

describe("Middleware: attachUser", () => {
  let req: any;
  let res: any;
  let next: NextFunction;

  beforeEach(() => {
    req = {
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
    jest.clearAllMocks();
  });

  it("should attach user from Redis if cache HIT (Fast Path)", async () => {
    const mockRedisUser = {
      _id: "db_id_123",
      email: "redis@test.com",
      auth0Id: "auth0|12345",
    };

    // 1. Mock Redis HIT
    (redisClient.get as jest.Mock).mockResolvedValue(
      JSON.stringify(mockRedisUser),
    );

    await attachUser(req, res, next);

    // Redis should be called
    expect(redisClient.get).toHaveBeenCalledWith("auth_session:auth0|12345");
    // Mongo should NOT be called
    expect(User.findOne).not.toHaveBeenCalled();
    // User should be attached
    expect(req.user).toEqual(mockRedisUser);
    expect(next).toHaveBeenCalled();
  });

  it("should fetch from Mongo and Cache if Redis MISS (Slow Path)", async () => {
    const mockDbUser = {
      _id: "db_id_123",
      email: "mongo@test.com",
      auth0Id: "auth0|12345",
      toObject: jest.fn().mockReturnValue({
        _id: "db_id_123",
        email: "mongo@test.com",
        auth0Id: "auth0|12345",
      }),
    };

    // 1. Mock Redis MISS
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    // 2. Mock Mongo FindOne -> Select -> Result
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(mockDbUser),
    });

    await attachUser(req, res, next);

    // Verify Flow
    expect(User.findOne).toHaveBeenCalledWith({ auth0Id: "auth0|12345" });
    expect(redisClient.setex).toHaveBeenCalled(); // Should cache the result
    expect(req.user).toEqual({
      _id: "db_id_123",
      email: "mongo@test.com",
      auth0Id: "auth0|12345",
    });
    expect(next).toHaveBeenCalled();
  });

  it("should return 401 if user is not found in DB", async () => {
    const consoleSpy = jest
      .spyOn(console, "warn") // Assuming you use logger.warn in the real code now
      .mockImplementation(() => {});

    // 1. Redis Miss
    (redisClient.get as jest.Mock).mockResolvedValue(null);

    // 2. Mongo Miss (Returns null after select)
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await attachUser(req, res, next);

    expect(req.user).toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
