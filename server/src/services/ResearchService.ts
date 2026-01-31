import { tavily } from "@tavily/core";
import logger from "../utils/logger";
import { env } from "../config/env";
import { modelGateway, TaskTier } from "./ModelGateway"; // 👈 Import Gateway

class ResearchService {
  private client;

  constructor() {
    // Initialize Tavily with the API Key from env
    this.client = tavily({ apiKey: env.TAVILY_API_KEY });
  }

  /**
   * Phase 1: Sanitized RAG
   * 1. Searches for the topic (Advanced Depth).
   * 2. Uses a cheap LLM to "read" the results and extract only facts.
   * 3. Returns a clean, condensed summary for the main generator.
   */
  async getTechnicalContext(topic: string): Promise<string> {
    try {
      logger.info(`🔍 [Research] Searching for latest info on: ${topic}`);

      const response = await this.client.search(topic, {
        search_depth: "advanced", // Deep search for technical details
        max_results: 5,
        include_answer: true, // Let Tavily summarize the answer first
      });

      // 1. Create the Raw Dump (Dirty Data)
      // We take a slice of content to prevent token overflow before summarization
      const rawContext = response.results
        .map(
          (r: any) =>
            `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content.slice(0, 800)}`,
        )
        .join("\n\n");

      // 2. The Sanitizer (Clean Data)
      // We ask the fast model to filter out noise (ads, SEO fluff)
      const summaryPrompt = `
        You are a technical researcher.
        Analyze the following search results about "${topic}".
        
        Extract ONLY:
        1. Core libraries/technologies mentioned.
        2. Key concepts and best practices.
        3. One real-world usage example.
        
        Constraints:
        - Keep it under 200 words.
        - Do not use markdown formatting like bolding, just plain text.
        - Ignore irrelevant SEO content or ads.
        
        RAW SEARCH DATA:
        ${response.answer ? `Tavily Summary: ${response.answer}\n` : ""}
        ${rawContext}
      `;

      // 3. Execute with Cheap Model (Llama 8B or Gemini Flash)
      const cleanSummary = await modelGateway.generate(
        summaryPrompt,
        TaskTier.FAST_UTILITY,
        "Output clean, factual text summaries only.",
      );

      logger.info("✅ [Research] Context sanitized and summarized.");

      return `VERIFIED WEB CONTEXT:\n${cleanSummary}`;
    } catch (error) {
      // Graceful degradation: If search fails, we continue without it.
      logger.warn(
        "⚠️ [Research] Search failed or timed out. Proceeding with internal knowledge.",
      );
      return "";
    }
  }
}

export const researchService = new ResearchService();
