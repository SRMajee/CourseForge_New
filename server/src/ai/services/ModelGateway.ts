import { ChatOpenAI } from "@langchain/openai";
import { ChatGroq } from "@langchain/groq";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export enum TaskTier {
  LOGIC_REASONING = "tier_gpt", // DeepSeek or Llama 70B (Smartest)
  CREATIVE_WRITING = "tier_llama_70b", // Llama 3.3 70B (Best Prose)
  FAST_UTILITY = "tier_llama_8b", // Llama 3.1 8B (Speed)
  JSON_REPAIR = "tier_gemini", // Gemini Flash (Fallback)
}

export class ModelGateway {
  /**
   * Returns a configured LangChain ChatModel instance based on the tier.
   * This decouples your business logic from the specific provider.
   */
  getChatModel(tier: TaskTier): BaseChatModel {
    switch (tier) {
      case TaskTier.LOGIC_REASONING:
      case TaskTier.CREATIVE_WRITING:
        return new ChatGroq({
          apiKey: process.env.GROQ_API_KEY,
          model: "llama-3.3-70b-versatile",
          temperature: 0.5,
          maxRetries: 2,
        });

      case TaskTier.FAST_UTILITY:
        return new ChatGroq({
          apiKey: process.env.GROQ_API_KEY,
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          maxRetries: 2,
        });

      case TaskTier.JSON_REPAIR:
        // Gemini is excellent at large context repair tasks
        return new ChatGoogleGenerativeAI({
          apiKey: process.env.GEMINI_API_KEY,
          model: "gemini-2.5-flash",
          temperature: 0,
          maxRetries: 3,
        });

      default:
        // Fallback to a safe default (e.g., Fast Llama)
        return new ChatGroq({
          apiKey: process.env.GROQ_API_KEY,
          model: "llama-3.1-8b-instant",
          temperature: 0.1,
        });
    }
  }
}

export const modelGateway = new ModelGateway();
