import { tavily } from "@tavily/core";
import logger from "../utils/logger";
import { env } from "../config/env";

class ResearchService {
  private client;

  constructor() {
    // Initialize Tavily with the API Key from env
    this.client = tavily({ apiKey: env.TAVILY_API_KEY });
  }

  /**
   * Phase 3.1: The "Agentic" Search
   * 1. Searches for the topic using 'advanced' depth.
   * 2. Returns a formatted string of "Facts" for the LLM.
   */
  async getTechnicalContext(topic: string): Promise<string> {
    try {
      logger.info(`[ResearchAgent] Searching for latest info on: ${topic}`);

      const response = await this.client.search(topic, {
        search_depth: "advanced", // Deep search for technical details
        max_results: 5,
        include_answer: true, // Let Tavily summarize the answer
      });

      // Format the results into a clean context block
      const context = response.results
        .map((result: any) => {
          return `SOURCE: ${result.title}\nURL: ${result.url}\nCONTENT: ${result.content.slice(0, 500)}...\n---`;
        })
        .join("\n");

      // Combine the direct answer with the raw sources
      const finalContext = `
LATEST WEB CONTEXT (Real-time Data):
${response.answer ? `Summary: ${response.answer}\n` : ""}
${context}
`;
      return finalContext;
    } catch (error) {
      // Graceful degradation: If search fails, we continue without it.
      logger.warn(
        "[ResearchAgent] Search failed. Proceeding with internal knowledge only.",
      );
      return "";
    }
  }
}

export const researchService = new ResearchService();
