import { create } from "zustand";
import { io, Socket } from "socket.io-client";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
  joinRoom: (userId: string) => void; // 👈 NEW: Allow manual joining
}

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
  "http://localhost:8080";

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (userId: string) => {
    const { socket } = get();

    // If socket exists, just ensure we are in the room
    if (socket) {
      if (!socket.connected) socket.connect();
      socket.emit("join_room", userId);
      return;
    }

    console.log("🔌 Initializing Socket Connection to:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      withCredentials: true, // ✅ Important for CORS cookies/headers if used
    });

    newSocket.on("connect", () => {
      console.log("✅ Socket Connected:", newSocket.id);
      set({ isConnected: true });
      // Immediately join the user's room
      newSocket.emit("join_room", userId);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Socket Disconnected");
      set({ isConnected: false });
    });

    newSocket.on("connect_error", (err) => {
      console.error("⚠️ Socket Connection Error:", err.message);
    });

    set({ socket: newSocket });
  },

  joinRoom: (userId: string) => {
    const { socket } = get();
    if (socket && socket.connected) {
      console.log(`👤 Joining Room: ${userId}`);
      socket.emit("join_room", userId);
    }
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));