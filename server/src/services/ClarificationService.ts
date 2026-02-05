import { modelGateway, TaskTier } from "./ModelGateway";
import {
  clarificationSchema,
  ClarificationResponse,
} from "../ai/parsers/clarificationSchema";
import logger from "../utils/logger";

class ClarificationService {
  async analyzeTopic(topic: string): Promise<ClarificationResponse> {
    const systemPrompt = `
      You are a Curriculum Architect.
      The user wants to learn: "${topic}"

      TASK:
      Generate 3-4 specific clarifying questions to tailor the course content.
      The questions must be **SPECIFIC** to "${topic}".
      
      OUTPUT JSON (Strict):
      {
        "isAmbiguous": true,
        "reason": "I need to know your specific focus within ${topic}.",
        "questions": [
          { 
            "id": "q1", 
            "text": "Question text...", 
            "type": "choice", 
            "options": ["Option A", "Option B", "Option C"] 
          }
        ]
      }
    `;

    try {
      const result = await modelGateway.generateStructured(
        `${systemPrompt}\n\nTopic: "${topic}"`,
        clarificationSchema,
        TaskTier.FAST_UTILITY,
      );

      // Force ambiguity for short topics
      const wordCount = topic.trim().split(/\s+/).length;
      if (!result.isAmbiguous && wordCount < 4) {
        result.isAmbiguous = true;
      }

      // INJECT "SKIP" OPTIONS
      // We manually add this so the user can explicitly choose to skip specific questions
      if (result.questions) {
        result.questions.forEach((q: ClarificationResponse['questions'][number]) => {
          if (
            q.type === "choice" &&
            !q.options.some((o: string) => o.toLowerCase().includes("skip"))
          ) {
            q.options.push("Not sure / Decide for me");
          }
        });
      }

      if (
        result.isAmbiguous &&
        result.questions &&
        result.questions.length > 0
      ) {
        return result;
      }

      throw new Error("Ambiguous but no questions generated.");
    } catch (error) {
      logger.warn(
        `⚠️ Clarification AI failed for "${topic}". Using Smart Fallback.`,
      );

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
