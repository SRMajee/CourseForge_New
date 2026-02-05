import { Response, NextFunction } from "express";
import { User } from "../models/User";
import { redisClient } from "../config/redis";
import logger from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const attachUser = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Validation (Fast CPU check)
    if (!req.auth || !req.auth.payload) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const auth0Id = req.auth.payload.sub;
    const cacheKey = `auth_session:${auth0Id}`;

    // -------------------------------------------------------
    // OPTIMIZATION: Check Redis Cache First (~2ms)
    // -------------------------------------------------------
    const cachedUser = await redisClient.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // -------------------------------------------------------
    // Fetch from Mongo (Only on Cache Miss)
    // -------------------------------------------------------
    const user = await User.findOne({ auth0Id }).select("_id email auth0Id");

    if (!user) {
      logger.warn(`❌ User not found for Auth0 ID: ${auth0Id}`);
      return res.status(401).json({ message: "User not synced" });
    }

    const sessionUser = {
      _id: user._id.toString(),
      email: user.email,
      auth0Id: user.auth0Id,
    };

    // 💾 SAVE TO CACHE (Expires in 1 hour)
    await redisClient.setex(cacheKey, 86400, JSON.stringify(sessionUser));
    req.user = sessionUser;
    next();
  } catch (error) {
    logger.error("💥 AttachUser Middleware Error", error);
    res.status(500).json({ message: "Server Error" });
  }
};
