import express, { Router } from "express";
import authRoutes from "./authRoutes";
import courseRoutes from "./courseRoutes";
import mediaRoutes from "./mediaRoutes";
import { checkJwt } from "../middleware/authMiddleware";
import { attachUser } from "../middleware/attachUser";
import paymentRoutes from "./paymentRoutes";
import { modelGateway } from "../services/ModelGateway";
import { trackSignal } from "../controllers/AnalyticsController";
import subscriptionRoutes from "./subscriptionRoutes";
const router = Router();
console.log("✅ LOADED: Main Router (routes/index.ts)"); // 👈 Add this
router.use("/auth", checkJwt, authRoutes);
router.use("/courses", checkJwt, attachUser, courseRoutes);
router.use("/media", checkJwt, attachUser, mediaRoutes);
router.use("/payment", checkJwt, paymentRoutes);
// Temporary Test Route
router.post("/test-router", async (req, res) => {
  const { prompt, tier } = req.body;
  try {
    // tier should be "tier_1", "tier_2", or "tier_3"
    const result = await modelGateway.generate(prompt, tier);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.post("/analytics/signal", trackSignal);
router.use("/subscription", checkJwt, attachUser, subscriptionRoutes);
export default router;
