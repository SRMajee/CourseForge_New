import { clarificationService } from "../../src/services/ClarificationService";
import { modelGateway } from "../../src/ai/services/ModelGateway";
import { PROMPTS } from "../../src/ai/prompts/prompts";

// Mock Model Gateway
jest.mock("../../src/ai/services/ModelGateway");
jest.mock("../../src/utils/logger");

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

    // Spy on PROMPTS pipe
    jest.spyOn(PROMPTS.CLARIFICATION, "pipe").mockReturnValue(mockChain as any);
    (modelGateway.getChatModel as jest.Mock).mockReturnValue({
      withStructuredOutput: jest.fn().mockReturnValue({}),
    });

    const result = await clarificationService.analyzeTopic("Learn Python");

    expect(mockChain.invoke).toHaveBeenCalledWith({ topic: "Learn Python" });
    expect(result.isAmbiguous).toBe(true);
    // Verify "Decide for me" option injection logic
    expect(result.questions![0].options).toContain("Not sure / Decide for me");
  });

  it("should force ambiguity for very short topics", async () => {
    const mockResponse = { isAmbiguous: false, reason: "Clear" }; // AI thinks it's clear

    const mockChain = { invoke: jest.fn().mockResolvedValue(mockResponse) };
    jest.spyOn(PROMPTS.CLARIFICATION, "pipe").mockReturnValue(mockChain as any);
    (modelGateway.getChatModel as jest.Mock).mockReturnValue({
      withStructuredOutput: jest.fn().mockReturnValue({}),
    });

    const result = await clarificationService.analyzeTopic("AI"); // Short topic

    expect(result.isAmbiguous).toBe(true); // Should be forced to true
  });
});
