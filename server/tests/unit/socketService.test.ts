import { Server } from "socket.io";
import { socketService } from "../../src/services/socketService";
import logger from "../../src/utils/logger";

// ✅ 1. Mock Env FIRST
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    PORT: 5000,
    REDIS_URL: "redis://localhost:6379",
    CLIENT_URL: "http://localhost:3000",
  },
}));

// ✅ 2. Mock Redis Package (v4 style)
// We need to mock the constructor/factory function `createClient`
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDuplicate = jest.fn(() => ({
  connect: mockConnect,
  on: jest.fn(),
}));

jest.mock("redis", () => ({
  createClient: jest.fn(() => ({
    connect: mockConnect,
    duplicate: mockDuplicate,
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

describe("SocketService Unit", () => {
  let mockIo: any;

  beforeEach(() => {
    // Reset singleton state (private property hack for testing)
    (socketService as any).io = null;
    jest.clearAllMocks();

    // Setup Mock IO Instance
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      on: jest.fn(),
    };
    (Server as unknown as jest.Mock).mockReturnValue(mockIo);
  });

  it("should initialize Redis clients and Socket.IO server", async () => {
    const httpServerMock = {} as any;

    // 1. Call Init
    await socketService.init(httpServerMock);

    // 2. Verify Redis Connections
    // createClient should be called once, then duplicate called on the result
    expect(require("redis").createClient).toHaveBeenCalledWith({
      url: "redis://localhost:6379",
    });
    expect(mockDuplicate).toHaveBeenCalled();
    // Both clients should connect
    expect(mockConnect).toHaveBeenCalledTimes(2);

    // 3. Verify Socket.IO Creation
    expect(Server).toHaveBeenCalledWith(httpServerMock, expect.anything());
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Socket.IO Redis Adapter connected"),
    );
  });

  it("should emit to specific user room if initialized", async () => {
    // 1. Initialize
    await socketService.init({} as any);

    // 2. Emit
    socketService.emitToUser("user_123", "test_event", { data: 1 });

    // 3. Verify IO calls
    expect(mockIo.to).toHaveBeenCalledWith("user_123");
    expect(mockIo.emit).toHaveBeenCalledWith("test_event", { data: 1 });
  });

  it("should log warning and not crash if emit called before init", () => {
    // 1. Ensure NOT initialized
    (socketService as any).io = null;

    // 2. Attempt Emit
    socketService.emitToUser("user_123", "event", {});

    // 3. Verify Warning
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("SocketService not initialized"),
    );
    // Should NOT throw
  });
});