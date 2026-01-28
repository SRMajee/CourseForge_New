import http from "http";
import app from "./app";
import { env } from "./config/env";
import logger from "./utils/logger";
import { connectDB } from "./config/db";
import { socketService } from "./services/socketService";
import "./workers/courseWorker"; // 👈 Worker starts here (Side-effect)

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Create HTTP Server (Wraps Express App)
    // Essential for Socket.io to attach correctly
    const server = http.createServer(app);

    // 3. Initialize Socket.io with the HTTP Server
    socketService.init(server);

    // 4. Start Listening
    server.listen(env.PORT, () => {
      logger.info(
        `🚀 Server running in ${env.NODE_ENV} mode on port ${env.PORT}`,
      );
      logger.info(`📡 Socket.io initialized`);
      logger.info(`👷 Background Worker active`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
