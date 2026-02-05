import express from "express";
import { authController } from "../controllers/authController";
import { attachUser } from "../middleware/attachUser";
import { checkJwt } from "../middleware/authMiddleware";


const router = express.Router();

router.post("/sync", authController.syncUser);
router.patch("/profile", attachUser, authController.updateProfile);
export default router;
