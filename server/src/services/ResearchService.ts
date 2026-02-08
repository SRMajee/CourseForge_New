import { tavily } from "@tavily/core";
import logger from "../utils/logger";
import { env } from "../config/env";
import { modelGateway, TaskTier } from "../ai/services/ModelGateway";
import { PROMPTS } from "../ai/prompts/prompts";
// ❌ DELETE: import z from "zod"; (Not needed anymore)

class ResearchService {
  private client;

  constructor() {
    this.client = tavily({ apiKey: env.TAVILY_API_KEY });
  }

  async getTechnicalContext(topic: string): Promise<string> {
    try {
      logger.info(`🔍 [Research] Searching for latest info on: ${topic}`);

      const response = await this.client.search(topic, {
        search_depth: "advanced",
        max_results: 5,
        include_answer: true,
      });

      const rawContext = response.results
        .map(
          (r: any) =>
            `Source: ${r.title}\nURL: ${r.url}\nContent: ${r.content.slice(0, 800)}`,
        )
        .join("\n\n");

      const model = modelGateway.getChatModel(TaskTier.FAST_UTILITY);

      const chain = PROMPTS.RESEARCH.pipe(model);

      const result = await chain.invoke({
        topic: topic,
        webContext: rawContext,
      });

      // ✅ NEW: Extract text directly from the message content
      const cleanSummary = result.content.toString();

      logger.info("✅ [Research] Context sanitized and summarized.");

      return `VERIFIED WEB CONTEXT:\n${cleanSummary}`;
    } catch (error) {
      logger.warn(
        "⚠️ [Research] Search failed or timed out. Proceeding with internal knowledge.",
      );
      return "";
    }
  }
}

export const researchService = new ResearchService();
