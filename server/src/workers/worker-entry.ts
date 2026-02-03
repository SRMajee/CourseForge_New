import express from "express";
import { courseWorker } from "./courseWorker"; // Triggers the worker instantiation
import logger from "../utils/logger";

const app = express();
// Render automatically sets this env var
const PORT = process.env.PORT || 10000;

// 1. Dummy Health Check for Render (and UptimeRobot)
app.get("/health", (req, res) => {
  res.status(200).send("Worker is active and processing jobs!");
});

// 2. Start the HTTP Server
// This keeps the Render Web Service "alive"
app.listen(PORT, () => {
  logger.info(`🚀 Worker listening on port ${PORT}`);
  logger.info(`⚙️ BullMQ Worker started: ${courseWorker.name}`);
});

// 3. Graceful Shutdown
const shutdown = async () => {
  logger.info("Sigterm received. Closing worker...");
  await courseWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
