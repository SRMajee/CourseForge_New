import express from "express";
import { connectDB } from "../config/db"; // 👈 IMPORT THIS
import { courseWorker } from "./courseWorker";
import logger from "../utils/logger";

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Dummy Health Check for Render
app.get("/", (req, res) => {
  res.send("Worker is running...");
});

// 2. Start the HTTP Server AND Database
const startWorker = async () => {
  try {
    // 👇 CRITICAL: Connect to MongoDB before accepting jobs
    await connectDB();
    logger.info("✅ Worker connected to MongoDB");

    app.listen(PORT, () => {
      logger.info(`🚀 Worker listening on port ${PORT}`);
      logger.info(`⚙️ BullMQ Worker started: ${courseWorker.name}`);
    });
  } catch (error) {
    logger.error("❌ Failed to start worker:", error);
    process.exit(1);
  }
};

startWorker();

// 3. Graceful Shutdown
const shutdown = async () => {
  logger.info("Sigterm received. Closing worker...");
  await courseWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
