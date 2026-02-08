import { codeExecutionService } from "../../src/services/CodeExecutionService";
import axios from "axios";
// We import CodeInterpreter to mock it
import CodeInterpreter from "@e2b/code-interpreter";

// Mock External Libraries
jest.mock("axios");
jest.mock("../../src/utils/logger");
jest.mock("../../src/config/env", () => ({
  env: { E2B_API_KEY: "mock_key" },
}));

// ✅ FIX: Mock default export structure
jest.mock("@e2b/code-interpreter", () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn(),
    },
  };
});

describe("CodeExecutionService Unit", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.E2B_API_KEY = "test_key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("execute (Piston)", () => {
    it("should return output on success", async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { run: { output: "Hello World" } },
      });

      const result = await codeExecutionService.execute(
        "python",
        "print('Hello World')",
      );
      expect(result.success).toBe(true);
      expect(result.output).toBe("Hello World");
    });

    it("should handle stderr as failure", async () => {
      (axios.post as jest.Mock).mockResolvedValue({
        data: { run: { stderr: "Syntax Error" } },
      });

      const result = await codeExecutionService.execute("python", "bad code");
      expect(result.success).toBe(false);
      expect(result.output).toContain("Error");
    });
  });

  describe("verifyCodeBlock (E2B)", () => {
    it("should skip if not python", async () => {
      const block = { type: "code", language: "js", code: "console.log()" };
      const result = await codeExecutionService.verifyCodeBlock(block);
      expect(result).toBe(block); // Unchanged
    });

    it("should run python loop if python", async () => {
      // Setup E2B Sandbox Mock
      const mockExec = jest.fn().mockResolvedValue({ error: null });
      const mockSandbox = {
        notebook: { execCell: mockExec },
        close: jest.fn(),
      };

      // ✅ FIX: Mock implementation on the imported class
      (CodeInterpreter.create as jest.Mock).mockResolvedValue(mockSandbox);

      const block = { type: "code", language: "python", code: "print('hi')" };
      const result = await codeExecutionService.verifyCodeBlock(block);

      expect(CodeInterpreter.create).toHaveBeenCalled();
      expect(mockExec).toHaveBeenCalled();
      expect(result.isVerified).toBe(true);
    });
  });
});
