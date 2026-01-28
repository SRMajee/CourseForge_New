import { Response, NextFunction } from "express";
import { User } from "../models/User";
declare global {
  namespace Express {
    interface Request {
      user?: any; // Or your User interface
    }
  }
}
export const attachUser = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  try {
    console.log("🔍 AttachUser: Middleware Started");

    // 1. Check if Auth0 Token exists
    if (!req.auth || !req.auth.payload) {
      console.error(
        "❌ AttachUser: No Auth0 Token found (req.auth is missing)",
      );
      return res.status(401).json({ message: "Authentication required" });
    }

    const auth0Id = req.auth.payload.sub;
    console.log("🔍 AttachUser: Auth0 ID found:", auth0Id);

    // 2. Find User in DB
    const user = await User.findOne({ auth0Id });

    if (!user) {
      console.error(
        "❌ AttachUser: User not found in MongoDB for this Auth0 ID",
      );
      return res.status(401).json({ message: "User not synced" });
    }

    // 3. Success
    console.log("✅ AttachUser: User found:", user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error("💥 AttachUser: Internal Error", error);
    res.status(500).json({ message: "Server Error" });
  }
};
