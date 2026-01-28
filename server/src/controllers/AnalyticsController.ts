import { Request, Response } from "express";
import { Feedback } from "../models/Feedback";
import logger from "../utils/logger";

export const trackSignal = async (req: Request, res: Response) => {
  try {
    const { generationId, action, original, final } = req.body;
    // @ts-ignore
    const userId = req.user?._id;

    // 1. Determine Signal
    // If they copied it -> Good. If they edited it heavily -> Bad.
    let signal = "positive";
    if (action === "regenerate") signal = "negative";
    if (action === "edit") {
      // Simple heuristic: If similarity < 80%, it's a negative signal
      // For now, we just log it as 'negative' implicit feedback
      signal = "negative";
    }

    // 2. Log Data
    await Feedback.create({
      userId,
      generationId,
      type: "implicit",
      signal,
      action,
      originalContent: original,
      finalContent: final,
    });

    // Silent success (don't block UI)
    return res.status(200).send();
  } catch (error) {
    logger.error("Analytics Error:", error);
    return res.status(200).send(); // Always 200 to not break client
  }
};
