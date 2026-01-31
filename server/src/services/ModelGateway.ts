import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { z, ZodTypeAny } from "zod";
import { wrapOpenAI } from "langsmith/wrappers";
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { retryWithBackoff } from "../utils/retryHelper";

export enum TaskTier {
  LOGIC_REASONING = "tier_deepseek", // DeepSeek-V3 (Smartest + Cheap)
  CREATIVE_WRITING = "tier_llama_70b", // Llama 3.3 70B (Best Prose)
  FAST_UTILITY = "tier_llama_8b", // Llama 3.1 8B (Sub-second speed)
  JSON_REPAIR = "tier_gemini", // Gemini 1.5 Flash (Free Repair)
}

export class ModelGateway {
  private openai: OpenAI;
  private deepseek: OpenAI;
  private gemini: GoogleGenerativeAI;
  private groq: Groq;

  constructor() {
    this.openai = wrapOpenAI(
      new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    );
    this.deepseek = wrapOpenAI(
      new OpenAI({
        baseURL: "https://api.deepseek.com",
        apiKey: process.env.DEEPSEEK_API_KEY,
      }),
    );
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  /**
   * The Main Router: Decides which model to call based on the Tier
   */
  async generate(
    prompt: string,
    tier: TaskTier,
    systemInstruction?: string,
    jsonMode: boolean = false, // 👈 New Flag to trigger Native JSON
  ): Promise<string> {
    try {
      switch (tier) {
        case TaskTier.LOGIC_REASONING:
          return this.callGroq(
            prompt,
            systemInstruction,
            "llama-3.3-70b-versatile",
            jsonMode,
          );
          // console.log("🧠 [Factory] Routing to DeepSeek-V3...");
          // return this.callDeepSeek(prompt, systemInstruction, jsonMode);

        case TaskTier.CREATIVE_WRITING:
          return this.callGroq(
            prompt,
            systemInstruction,
            "llama-3.3-70b-versatile",
            jsonMode,
          );

        case TaskTier.FAST_UTILITY:
          return this.callGroq(
            prompt,
            systemInstruction,
            "llama-3.1-8b-instant",
            jsonMode,
          );

        case TaskTier.JSON_REPAIR:
          return this.callGroq(
            prompt,
            systemInstruction,
            "llama-3.3-70b-versatile",
            jsonMode,
          );
          // return this.callGemini(prompt, systemInstruction);

        default:
          throw new Error("Invalid Task Tier");
      }
    } catch (error) {
      console.error(`Error in ModelGateway [${tier}]:`, error);
      // Fallback Strategy
      if (tier === TaskTier.LOGIC_REASONING) {
        console.warn("⚠️ DeepSeek failed, falling back to Groq...");
        return this.callGroq(
          prompt,
          systemInstruction,
          "llama-3.3-70b-versatile",
          jsonMode,
        );
      }
      throw error;
    }
  }

  // --- MODEL DRIVERS (Updated for Native Schemas) ---

  // 1. DeepSeek Driver
  private callDeepSeek = traceable(
    async (prompt: string, system?: string, jsonMode?: boolean) => {
      const run = getCurrentRunTree();
      return retryWithBackoff(async () => {
        const response = await this.deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: system || "You are a helpful assistant.",
            },
            { role: "user", content: prompt },
          ],
          // ✅ DeepSeek supports JSON mode natively
          response_format: jsonMode ? { type: "json_object" } : undefined,
          temperature: 0.3,
        });

        const usage = response.usage;
        if (run && usage) {
          run.metadata = { ...run.metadata, token_usage: usage };
        }
        return response.choices[0].message.content || "";
      });
    },
    {
      name: "DeepSeek V3",
      run_type: "llm",
      metadata: { ls_provider: "deepseek" },
    },
  );

  // 2. Groq Driver
  private callGroq = traceable(
    async (
      prompt: string,
      system?: string,
      modelId?: string,
      jsonMode?: boolean,
    ) => {
      const run = getCurrentRunTree();
      return retryWithBackoff(async () => {
        const response = await this.groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: system || "You are a fast utility bot.",
            },
            { role: "user", content: prompt },
          ],
          model: modelId || "llama-3.3-70b-versatile",
          // ✅ Groq (Llama 3) supports JSON mode natively
          response_format: jsonMode ? { type: "json_object" } : undefined,
        });

        const usage = response.usage;
        if (run && usage) {
          run.metadata = { ...run.metadata, token_usage: usage };
        }
        return response.choices[0]?.message?.content || "";
      });
    },
    { name: "Groq Llama", run_type: "llm", metadata: { ls_provider: "groq" } },
  );

  // 3. Gemini Driver
  private callGemini = traceable(
    async (prompt: string, system?: string) => {
      const run = getCurrentRunTree();
      return retryWithBackoff(async () => {
        const model = this.gemini.getGenerativeModel({
          // ✅ FIXED: Use Stable Model (1.5-flash)
          model: "gemini-1.5-flash",
          systemInstruction: system,
          generationConfig: {
            // ✅ GUARDRAIL: Forces Gemini to output JSON
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const usage = response.usageMetadata;

        if (run && usage) {
          run.metadata = {
            ...run.metadata,
            token_usage: {
              prompt_tokens: usage.promptTokenCount,
              completion_tokens: usage.candidatesTokenCount,
              total_tokens: usage.totalTokenCount,
            },
          };
        }
        return response.text();
      });
    },
    {
      name: "Gemini Flash",
      run_type: "llm",
      metadata: { ls_provider: "google" },
    },
  );

  /**
   * SELF-HEALING GENERATOR (Simplified for Phase 2)
   */
  generateStructured = traceable(
    async <S extends ZodTypeAny>(
      prompt: string,
      schema: S,
      initialTier: TaskTier,
      maxRetries = 2,
    ): Promise<z.infer<S>> => {
      let currentPrompt = prompt;
      let attempts = 0;
      let currentTier = initialTier;

      while (attempts <= maxRetries) {
        try {
          console.log(
            `🔄 [Attempt ${attempts + 1}] Generating structure with ${currentTier}...`,
          );

          // ✅ 1. Enable JSON Mode via Flag
          const rawResult = await this.generate(
            currentPrompt,
            currentTier,
            "You are a strict data generator. Output only valid JSON.",
            true, // <--- Forces API JSON Mode
          );

          // 2. Parse
          const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON object found");

          const parsedJson = JSON.parse(jsonMatch[0]);

          // 3. Validate
          const validation = schema.safeParse(parsedJson);

          if (validation.success) {
            console.log("✅ [Validation] Success!");
            return validation.data;
          }

          // 4. Heal
          console.warn("❌ [Validation] Failed. Triggering Self-Healing...");
          const errors = validation.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");

          currentTier = TaskTier.JSON_REPAIR; // Switch to Gemini for repair
          currentPrompt = `PREVIOUS OUTPUT WAS INVALID.\nERROR: ${errors}\nORIGINAL REQUEST: ${prompt}\nACTION: Fix the JSON structure.`;
          attempts++;
        } catch (error: any) {
          console.warn(`❌ [Attempt ${attempts + 1}] Error:`, error.message);
          if (error.message.includes("Max retries exceeded")) throw error;

          // Retry logic
          currentTier = TaskTier.JSON_REPAIR;
          currentPrompt = `The previous output was not valid JSON. Return ONLY the raw JSON string.\nOriginal Prompt: ${prompt}`;
          attempts++;
        }
      }

      throw new Error(
        `Failed to generate valid structure after ${attempts} attempts.`,
      );
    },
    { name: "Self-Healing Loop", run_type: "chain" },
  );
}

export const modelGateway = new ModelGateway();

