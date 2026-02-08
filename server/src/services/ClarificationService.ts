import { modelGateway, TaskTier } from "../ai/services/ModelGateway";
import {
  clarificationSchema,
  ClarificationResponse,
} from "../ai/parsers/clarificationSchema";
import logger from "../utils/logger";
import { PROMPTS } from "../ai/prompts/prompts";

class ClarificationService {
  async analyzeTopic(topic: string): Promise<ClarificationResponse> {
    try {
      const model = modelGateway.getChatModel(TaskTier.LOGIC_REASONING);
      const structuredLlm = model.withStructuredOutput(clarificationSchema);
      const chain = PROMPTS.CLARIFICATION.pipe(structuredLlm);

      const result = (await chain.invoke({
        topic: topic,
      })) as ClarificationResponse;

      // Force ambiguity for short topics
      const wordCount = topic.trim().split(/\s+/).length;
      if (!result.isAmbiguous && wordCount < 4) {
        result.isAmbiguous = true;
      }

      // INJECT "SKIP" OPTIONS
      if (result.questions) {
        result.questions.forEach(
          (q: ClarificationResponse["questions"][number]) => {
            if (
              q.type === "choice" &&
              !q.options.some((o: string) => o.toLowerCase().includes("skip"))
            ) {
              q.options.push("Not sure / Decide for me");
            }
          },
        );
      }

      if (
        result.isAmbiguous &&
        result.questions &&
        result.questions.length > 0
      ) {
        return result;
      }

      // If we got here, it's ambiguous but has no questions?
      // Just return it (the controller handles non-ambiguous cases)
      return result;
    } catch (error: any) {
      // LOG THE ACTUAL ERROR
      logger.error(`❌ Clarification AI Failed for "${topic}":`, error);

      logger.warn(`⚠️ Using Smart Fallback for "${topic}".`);

      return {
        isAmbiguous: true,
        reason: `We need to tailor this ${topic} course to your exact needs.`,
        questions: [
          {
            id: "user_level",
            text: `What is your current experience with ${topic}?`,
            type: "choice",
            options: [
              "Beginner",
              "Intermediate",
              "Advanced",
              "Not sure / Decide for me",
            ],
          },
          {
            id: "user_goal",
            text: "What is your primary goal?",
            type: "choice",
            options: [
              "Build a specific project",
              "Job / Interview Prep",
              "Deep dive",
              "Just exploring",
              "Not sure / Decide for me",
            ],
          },
        ],
      };
    }
  }
}

export const clarificationService = new ClarificationService();
