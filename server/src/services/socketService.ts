import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import logger from "../utils/logger";

class SocketService {
  private io: Server | null = null;

  public init(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
      pingTimeout: 60000, // Increase tolerance
    });

    this.io.on("connection", (socket: Socket) => {
      logger.info(`🔌 [Socket] Connected: ${socket.id}`);

      // DEBUG: Log all incoming events
      socket.onAny((event, ...args) => {
        logger.info(`📨 [Socket In] Event: "${event}" | Data:`, args);
      });

      socket.on("join_room", (userId: string) => {
        if (!userId) {
          logger.warn(`⚠️ [Socket] join_room with NULL userId`);
          return;
        }
        const roomName = String(userId);
        socket.join(roomName);
        logger.info(`👤 [Socket] ${socket.id} JOINED room: "${userId}"`);

        // Acknowledge (Helps frontend know it's connected)
        socket.emit("room_joined", { room: userId });
      });

      socket.on("disconnect", (reason) => {
        logger.info(`❌ [Socket] Disconnected: ${socket.id} (${reason})`);
      });
    });
  }

  public emitToUser(userId: string | any, event: string, data: any) {
    if (this.io) {
      const roomName = String(userId); // 👈 CRITICAL FIX
      // logger.info(`📡 Emitting "${event}" to Room: "${roomName}"`);
      this.io.to(roomName).emit(event, data);
    } else {
      logger.warn("SocketService not initialized!");
    }
  }
}

export const socketService = new SocketService();
