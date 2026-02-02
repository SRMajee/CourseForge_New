import { researchService } from "../../src/services/ResearchService";
import { modelGateway } from "../../src/services/ModelGateway";
import { tavily } from "@tavily/core";

// ✅ FIX: Define the inner mock INSIDE the factory
jest.mock("@tavily/core", () => {
  const mSearch = jest.fn();
  const mTavily = jest.fn(() => ({
    search: mSearch,
  }));
  // Attach the inner mock to the factory function so we can grab it later
  (mTavily as any).__mockSearch = mSearch;
  return { tavily: mTavily };
});

// Retrieve the inner mock handle safely
const mockSearch = (tavily as any).__mockSearch;

// Mock Model Gateway (AI Summarizer)
jest.mock("../../src/services/ModelGateway");

// Mock Env
jest.mock("../../src/config/env", () => ({
  env: { TAVILY_API_KEY: "mock-key" },
}));

// Mock Logger
jest.mock("../../src/utils/logger");

describe("ResearchService Unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return summarized context on success", async () => {
    // 1. Mock Search Response
    mockSearch.mockResolvedValue({
      results: [{ title: "T1", url: "u1", content: "c1" }],
      answer: "Short Answer",
    });

    // 2. Mock AI Summary
    (modelGateway.generate as jest.Mock).mockResolvedValue("Clean Summary");

    const result = await researchService.getTechnicalContext("React");

    expect(mockSearch).toHaveBeenCalledWith("React", expect.anything());
    expect(modelGateway.generate).toHaveBeenCalled();
    expect(result).toContain("VERIFIED WEB CONTEXT");
    expect(result).toContain("Clean Summary");
  });

  it("should return empty string gracefully if search fails", async () => {
    // 1. Mock Failure
    mockSearch.mockRejectedValue(new Error("API Down"));

    const result = await researchService.getTechnicalContext("React");

    // 2. Expect Graceful Degradation (No crash)
    expect(result).toBe("");
  });
});
