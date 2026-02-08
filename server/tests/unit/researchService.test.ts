import { researchService } from "../../src/services/ResearchService";
import { modelGateway } from "../../src/ai/services/ModelGateway";
import { PROMPTS } from "../../src/ai/prompts/prompts";

// 1. Advanced Mock for Tavily to allow spy access
jest.mock("@tavily/core", () => {
  const mSearch = jest.fn();
  // Factory function returns the mock class/object
  return {
    tavily: jest.fn(() => ({
      search: mSearch,
    })),
    // Expose the spy for test assertions
    __mockSearch: mSearch,
  };
});

// Retrieve the inner mock handle safely
const mockSearch = (require("@tavily/core") as any).__mockSearch;

// 2. Mock Model Gateway
jest.mock("../../src/ai/services/ModelGateway");

// 3. Mock Env
jest.mock("../../src/config/env", () => ({
  env: { TAVILY_API_KEY: "mock-key" },
}));

// 4. Mock Logger to silence output
jest.mock("../../src/utils/logger");

describe("ResearchService Unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return summarized text context on success", async () => {
    // A. Setup Tavily Response
    mockSearch.mockResolvedValue({
      results: [
        { title: "React Docs", url: "react.dev", content: "React is a lib..." },
      ],
      answer: "Short Tavily Answer",
    });

    // B. Setup LangChain Pipeline Mock
    const mockChainResponse = { content: "Clean Summary Text" }; // Standard AIMessage format
    const mockChain = {
      invoke: jest.fn().mockResolvedValue(mockChainResponse),
    };

    // Mock Model Gateway to return a dummy object
    (modelGateway.getChatModel as jest.Mock).mockReturnValue({});

    // Spy on the 'pipe' method of the specific PROMPT
    // This intercepts: PROMPTS.RESEARCH.pipe(model)
    const pipeSpy = jest
      .spyOn(PROMPTS.RESEARCH, "pipe")
      .mockReturnValue(mockChain as any);

    // C. Execute
    const result = await researchService.getTechnicalContext("React");

    // D. Assertions
    expect(mockSearch).toHaveBeenCalledWith("React", expect.anything());
    expect(pipeSpy).toHaveBeenCalled();
    expect(mockChain.invoke).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "React",
        webContext: expect.stringContaining("React is a lib"),
      }),
    );

    // Verify formatting
    expect(result).toContain("VERIFIED WEB CONTEXT");
    expect(result).toContain("Clean Summary Text");
  });

  it("should return empty string gracefully if search fails", async () => {
    // A. Mock Tavily Failure
    mockSearch.mockRejectedValue(new Error("API Timeout"));

    const result = await researchService.getTechnicalContext("React");

    // B. Expect Graceful Degradation (No crash)
    expect(result).toBe("");
  });
});