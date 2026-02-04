import { Server } from "socket.io";

// ✅ 1. Mock Env FIRST
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    REDIS_URL: "redis://localhost:6379",
  },
}));

// ✅ 2. Mock Redis Package (Crucial for the new async init)
jest.mock("redis", () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    duplicate: jest.fn(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
    })),
    on: jest.fn(),
  })),
}));

// ✅ 3. Mock Redis Adapter
jest.mock("@socket.io/redis-adapter", () => ({
  createAdapter: jest.fn(),
}));

// ✅ 4. Mock Logger & Socket.io
jest.mock("../../src/utils/logger");
jest.mock("socket.io");

// ✅ 5. Import Dependencies
import { socketService } from "../../src/services/socketService";
import logger from "../../src/utils/logger";

describe("SocketService Unit", () => {
  let mockIo: any;

  beforeEach(() => {
    // Reset singleton state
    (socketService as any).io = null;
    jest.clearAllMocks();

    // Mock IO Instance
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn(),
    };
    (Server as unknown as jest.Mock).mockReturnValue(mockIo);
  });

  // 👇 FIX: Make this test async
  it("should emit to specific user room if initialized", async () => {
    // 1. Initialize (Wait for Redis connection mock)
    await socketService.init({} as any);

    // 2. Emit
    socketService.emitToUser("user_123", "test_event", { data: 1 });

    // 3. Verify
    expect(mockIo.to).toHaveBeenCalledWith("user_123");
    expect(mockIo.emit).toHaveBeenCalledWith("test_event", { data: 1 });
  });

  it("should log warning and not crash if emit called before init", () => {
    // 1. Ensure NOT initialized
    (socketService as any).io = null;

    // 2. Emit
    socketService.emitToUser("user_123", "event", {});

    // 3. Verify Logger Warn called
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("not initialized"),
    );
  });
});
