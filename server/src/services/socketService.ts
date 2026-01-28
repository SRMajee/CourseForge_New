// src/services/socketService.ts
// This service allows us to send messages to specific users via their userId.

import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import logger from "../utils/logger";

class SocketService {
  private io: Server | null = null;

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*", // Lock this down in production
        methods: ["GET", "POST"],
      },
    });

    this.io.on("connection", (socket: Socket) => {
      logger.info(`🔌 User connected: ${socket.id}`);

      // Allow frontend to join a "room" based on their User ID
      socket.on("join_room", (userId: string) => {
        socket.join(userId);
        logger.info(`👤 Socket ${socket.id} joined room: ${userId}`);
      });
    });
  }

  // ✅ The Magic Method: Call this from ANY worker
  public emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(userId).emit(event, data);
    } else {
      logger.warn("SocketService not initialized!");
    }
  }
}

export const socketService = new SocketService();
