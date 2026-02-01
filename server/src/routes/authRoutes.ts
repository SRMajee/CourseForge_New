import express from "express";
import { authController } from "../controllers/authController";
import { attachUser } from "../middleware/attachUser";
import { checkJwt } from "../middleware/authMiddleware";

// console.log("✅ LOADED: authRoutes.ts (The correct file is running!)");

const router = express.Router();

// Define the route
router.post("/sync", authController.syncUser);
router.patch("/profile", attachUser, authController.updateProfile);
export default router;
