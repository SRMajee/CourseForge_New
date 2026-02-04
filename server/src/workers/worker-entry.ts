import express from "express";
import { connectDB } from "../config/db";
import { courseWorker } from "./courseWorker";
import logger from "../utils/logger";
import { socketService } from "../services/socketService";

const app = express();
// Render sets PORT to 10000 automatically
const PORT = process.env.PORT || 10000;

// 1. Dummy Health Check for Render
app.get("/", (req, res) => {
  res.status(200).send("Worker is running...");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
  console.log("📡 [Health Check] Worker is healthy");
});

// 2. Start the HTTP Server AND Database
const startWorker = async () => {
  try {
    // A. Connect to Database (Required for job processing)
    await connectDB();
    logger.info("✅ Worker connected to MongoDB");

    // B. Start the HTTP Server (Keeps Render Service alive)
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Worker listening on port ${PORT}`);
      logger.info(`⚙️ BullMQ Worker started: ${courseWorker.name}`);
    });

    // C. Initialize Socket Service with Redis Adapter
    // We await this so we don't process jobs before the socket is ready
    await socketService.init(server);
    logger.info("✅ Worker Socket Service initialized");
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
