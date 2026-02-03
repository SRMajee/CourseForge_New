import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter"; // 👈 New
import { createClient } from "redis"; // 👈 New
import { env } from "../config/env";
import logger from "../utils/logger";

class SocketService {
  private io: Server | null = null;

  // Changed to async to handle Redis connection
  public async init(httpServer: HttpServer) {
    if (this.io) return;

    // 1. Create Redis Clients for the Adapter
    // These allow the Worker and API to talk to each other
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();

    try {
      await Promise.all([pubClient.connect(), subClient.connect()]);
      logger.info("✅ Socket.IO Redis Adapter connected");
    } catch (err) {
      logger.error("❌ Socket.IO Redis Adapter failed:", err);
    }

    // 2. Initialize Socket.IO with the Adapter
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CLIENT_URL || "*",
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      // 👇 This bridges the gap between Worker and API
      adapter: createAdapter(pubClient, subClient),
    });

    this.io.on("connection", (socket: Socket) => {
      logger.info(`🔌 [Socket] Connected: ${socket.id}`);

      socket.onAny((event, ...args) => {
        // Optional: reduce log noise in production
        if (env.NODE_ENV !== "production") {
          logger.info(`📨 [Socket In] Event: "${event}"`);
        }
      });

      socket.on("join_room", (userId: string) => {
        if (!userId) return;
        const roomName = String(userId);
        socket.join(roomName);
        logger.info(`👤 [Socket] ${socket.id} JOINED room: "${roomName}"`);
        socket.emit("room_joined", { room: roomName });
      });

      socket.on("disconnect", (reason) => {
        logger.info(`❌ [Socket] Disconnected: ${socket.id} (${reason})`);
      });
    });
  }

  public emitToUser(userId: string | any, event: string, data: any) {
    if (this.io) {
      const roomName = String(userId);
      // The Redis Adapter will automatically forward this to the API server
      this.io.to(roomName).emit(event, data);
    } else {
      logger.warn(`⚠️ SocketService not initialized! Cannot emit "${event}"`);
    }
  }
}

export const socketService = new SocketService();
