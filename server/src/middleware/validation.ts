import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 1. Catch Auth0 "UnauthorizedError"
  if (err.name === "UnauthorizedError") {
    logger.warn(
      `🔒 [Auth Fail] Missing/Invalid Token: ${req.method} ${req.path}`,
    );
    return res
      .status(401)
      .json({ message: "Invalid or missing authentication token" });
  }

  // 2. Catch JSON Syntax Errors (common in bad requests)
  if (err instanceof SyntaxError && "body" in err) {
    logger.warn(`⚠️ [Bad Request] Invalid JSON in body`);
    return res.status(400).json({ message: "Invalid JSON format" });
  }

  // 3. Default Error Handler
  logger.error("❌ [Server Error]", err);
  return res.status(500).json({ message: "Internal Server Error" });
};
