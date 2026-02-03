import { Request, Response } from "express";
import { User } from "../models/User";
import logger from "../utils/logger";

export const authController = {
  // POST /api/v1/auth/sync
  syncUser: async (req: Request, res: Response) => {
    try {
      const { auth0Id, email, name, picture } = req.body;

      logger.info("Sync User Data:", { auth0Id, email, name });

      if (!auth0Id || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // 👇 FIXED: Atomic Upsert (Find or Create in one step)
      // - filter: Find by auth0Id
      // - update: Set the fields we want to ensure are fresh
      // - options: new: true (return updated doc), upsert: true (create if missing)
      const user = await User.findOneAndUpdate(
        { auth0Id },
        {
          $set: {
            email,
            name: name || email,
            picture,
            // Only set createdAt if it's a new document
            // Mongoose timestamps handles updated_at automatically
          },
          $setOnInsert: {
            credits: 199, // Free credits only on FIRST creation
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );

      // If the document was just created, it might not have the 'credits' field
      // populated in the return value if $setOnInsert didn't trigger (i.e. it was an update).
      // But since we want to return the user, this is fine.

      if (!user) {
        throw new Error("Failed to sync user");
      }

      // Log success only if it was actually a new creation (optional logic)
      // or just log general success
      logger.info(`✅ User Synced: ${user.email}`);

      res.status(200).json(user);
    } catch (error) {
      logger.error("Sync Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },

  // ... (keep updateProfile as is)
  updateProfile: async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const userId = req.user?._id;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { name },
        { new: true },
      );

      res.json({ message: "Profile updated", user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: "Server Error" });
    }
  },
};
