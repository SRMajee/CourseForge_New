// ✅ 1. Mock Env FIRST (Crucial: Prevents process.exit(1) crash)
jest.mock("../../src/config/env", () => ({
  env: {
    NODE_ENV: "test",
    OPENAI_API_KEY: "mock-key",
    GEMINI_API_KEY: "mock-key",
    GROQ_API_KEY: "mock-key",
    TAVILY_API_KEY: "mock-key",
  },
}));

// ✅ 2. Mock Logger (Prevents console noise)
jest.mock("../../src/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// ✅ 3. Mock Model Gateway
jest.mock("../../src/ai/services/ModelGateway");

// ✅ 4. Import SUT (System Under Test) AFTER mocks are defined
import { clarificationService } from "../../src/services/ClarificationService";
import { modelGateway } from "../../src/ai/services/ModelGateway";
import { PROMPTS } from "../../src/ai/prompts/prompts";

describe("ClarificationService Unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return analysis from AI model", async () => {
    // 1. Mock Chain Output
    const mockResponse = {
      isAmbiguous: true,
      reason: "Too broad",
      questions: [
        { id: "q1", text: "Specifics?", type: "choice", options: ["A", "B"] },
      ],
    };

    const mockChain = {
      invoke: jest.fn().mockResolvedValue(mockResponse),
    };

    // Spy on PROMPTS pipe to intercept the chain
    jest.spyOn(PROMPTS.CLARIFICATION, "pipe").mockReturnValue(mockChain as any);

    // Mock the Model Gateway to return a dummy structure that supports 'withStructuredOutput'
    (modelGateway.getChatModel as jest.Mock).mockReturnValue({
      withStructuredOutput: jest.fn().mockReturnValue({}),
    });

    const result = await clarificationService.analyzeTopic("Learn Python");

    expect(mockChain.invoke).toHaveBeenCalledWith({ topic: "Learn Python" });
    expect(result.isAmbiguous).toBe(true);

    // Verify "Decide for me" option injection logic (Business Logic Check)
    expect(result.questions![0].options).toContain("Not sure / Decide for me");
  });

  it("should force ambiguity for very short topics", async () => {
    const mockResponse = { isAmbiguous: false, reason: "Clear" }; // AI thinks it's clear

    const mockChain = { invoke: jest.fn().mockResolvedValue(mockResponse) };

    jest.spyOn(PROMPTS.CLARIFICATION, "pipe").mockReturnValue(mockChain as any);
    (modelGateway.getChatModel as jest.Mock).mockReturnValue({
      withStructuredOutput: jest.fn().mockReturnValue({}),
    });

    // "AI" is very short (word count < 4), so logic should force ambiguous = true
    const result = await clarificationService.analyzeTopic("AI");

    expect(result.isAmbiguous).toBe(true);
  });
});
