import { create } from "zustand";
import { io, Socket } from "socket.io-client";

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  connect: (userId: string) => void;
  disconnect: () => void;
}

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace("/api/v1", "") ||
  "http://localhost:8080";

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (userId: string) => {
    const { socket } = get();

    // ✅ FIX: Check if socket INSTANCE exists, not just if connected.
    // This prevents creating a second socket while the first is still shaking hands.
    if (socket) return;

    // console.log("🔌 Initializing Socket Connection to:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      // console.log("✅ Socket Connected:", newSocket.id);
      set({ isConnected: true });
      newSocket.emit("join_room", userId);
    });

    newSocket.on("disconnect", () => {
      // console.log("❌ Socket Disconnected");
      set({ isConnected: false });
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      // console.log("🛑 Disconnecting Socket");
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },
}));
