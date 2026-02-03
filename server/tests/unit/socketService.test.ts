import { Server } from "socket.io";

// ✅ 1. Mock Env FIRST (Prevents process.exit(1) crash)
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
  },
}));

// ✅ 2. Mock Redis (Prevents potential connection errors if service imports it)
jest.mock("../../src/config/redis", () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
    connect: jest.fn(),
  },
  redisConnection: {
    on: jest.fn(),
  },
}));

// ✅ 3. Mock Logger & Socket.io
jest.mock("../../src/utils/logger");
jest.mock("socket.io");

// ✅ 4. Import Dependencies
import { socketService } from "../../src/services/socketService";
import logger from "../../src/utils/logger";

describe("SocketService Unit", () => {
  let mockIo: any;

  beforeEach(() => {
    // Reset the singleton state (simulating fresh start)
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

  it("should emit to specific user room if initialized", () => {
    // 1. Initialize
    socketService.init({} as any);

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
