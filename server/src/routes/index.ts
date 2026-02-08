import express, { Router } from "express";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import mediaRoutes from "./mediaRoutes";
import { checkJwt } from "../middleware/authMiddleware";
import { attachUser } from "../middleware/attachUser";
import paymentRoutes from "./paymentRoutes";
import { modelGateway } from "../ai/services/ModelGateway";
import { trackSignal } from "../controllers/AnalyticsController";
import { getAppConfig } from "../controllers/configController";
import subscriptionRoutes from "./subscriptionRoutes";

const router = Router();

router.use("/auth", checkJwt, authRoutes);
router.use("/courses", checkJwt, attachUser, courseRoutes);
router.use("/media", checkJwt, attachUser, mediaRoutes);
router.use("/payment", checkJwt, paymentRoutes);
router.post("/analytics/signal", trackSignal);
router.use("/subscription", checkJwt, attachUser, subscriptionRoutes);
router.get("/config", getAppConfig);
export default router;
