import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { z, ZodTypeAny } from "zod"; // 👈 Import ZodTypeAny
import { wrapOpenAI } from "langsmith/wrappers"; // 👈 For OpenAI automatic tracing
import { traceable, getCurrentRunTree } from "langsmith/traceable";
import { retryWithBackoff } from "../utils/retryHelper";
// Define the Tiers based on your plan
export enum TaskTier {
  COMPLEX_PLANNING = "tier_1", // Pro: GPT-4o / DeepSeek (Smartest)
  BASIC_PLANNING = "tier_1_basic", // Free: Llama 3 (Fastest/Cheapest)
  BULK_CONTENT = "tier_2", // Bulk: Gemini / Llama
  FAST_UTILITY = "tier_3", // Utility: Llama 3
}

export class ModelGateway {
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;
  private groq: Groq;

  constructor() {
    // 1. Wrap OpenAI (Auto-tracks tokens & cost via the wrapper)
    this.openai = wrapOpenAI(
      new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
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
  ): Promise<string> {
    try {
      switch (tier) {
        case TaskTier.COMPLEX_PLANNING:
          // console.log("🧠 [Tier 1 PRO] Using GPT-4o/DeepSeek...");
          // return this.callOpenAI(prompt, systemInstruction);

          // ✅ ADD THIS TEMPORARY LINE (Fallback to Gemini)
          // Gemini 1.5 Flash is smart enough to handle the syllabus for now.
          // console.log("⚠️ [Limit Reached] Redirecting Tier 1 to Gemini...");
          // return this.callGemini(prompt, systemInstruction);
          console.log("⚡ [Tier 1 Strategy] Using Groq (Llama 3) for speed...");
          return this.callGroq(prompt, systemInstruction);
        case TaskTier.BASIC_PLANNING:
          console.log("⚡ [Tier 1 BASIC] Using Groq (Llama 3)...");
          return this.callGroq(prompt, systemInstruction);
        case TaskTier.BULK_CONTENT:
          // return this.callGemini(prompt, systemInstruction);
          return this.callGroq(prompt, systemInstruction);
        case TaskTier.FAST_UTILITY:
          return this.callGroq(prompt, systemInstruction);
        default:
          throw new Error("Invalid Task Tier");
      }
    } catch (error) {
      console.error(`Error in ModelGateway [${tier}]:`, error);
      // Fallback Strategy: If Groq/Gemini fails, fall back to OpenAI (optional)
      if (tier !== TaskTier.COMPLEX_PLANNING) {
        console.warn("Falling back to OpenAI...");
        return this.callOpenAI(prompt, systemInstruction);
      }
      throw error;
    }
  }

  // --- TIER 1: GPT-4o ---
  private async callOpenAI(prompt: string, system?: string): Promise<string> {
    return retryWithBackoff(async () => {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: system || "You are a helpful assistant." },
          { role: "user", content: prompt },
        ],
      });
      return response.choices[0].message.content || "";
    });
  }

  // --- TIER 2: Gemini (Fixed Rate Limits) ---
  private callGemini = traceable(
    async (prompt: string, system?: string) => {
      const run = getCurrentRunTree();
      return retryWithBackoff(async () => {
        const model = this.gemini.getGenerativeModel({
          model: "gemini-2.5-flash",
          systemInstruction: system,
          generationConfig: {
            responseMimeType: "application/json",
          },
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        // Log Usage
        const usage = response.usageMetadata;
        console.log("💎 Gemini Usage:", usage);
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
      metadata: {
        ls_provider: "google",
        ls_model_name: "gemini-2.5-flash",
      },
    },
  );

  // --- TIER 3: Groq ---
  private callGroq = traceable(
    async (prompt: string, system?: string) => {
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
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
        });

        const usage = response.usage;

        // 🔍 DEBUG: Check if we are getting usage from Groq
        if (!usage) console.warn("⚠️ Groq did not return usage stats!");
        else console.log("⚡ Groq Usage:", usage);
        if (run && usage) {
          run.metadata = {
            ...run.metadata,
            token_usage: {
              prompt_tokens: usage.prompt_tokens,
              completion_tokens: usage.completion_tokens,
              total_tokens: usage.total_tokens,
            },
          };
        }
        return response.choices[0]?.message?.content || "";
      });
    },
    {
      name: "Groq Llama3",
      run_type: "llm",
      metadata: {
        ls_provider: "groq",
        ls_model_name: "llama-3.3-70b-versatile",
      },
    },
  );

  /**
   * SPECULATIVE DRAFTING LOOP
   * Phase 1: High-Speed Draft (Groq)
   * Phase 2: Intelligent Polish (GPT-4o-mini)
   */
  async draftAndVerify(userPrompt: string, context: string): Promise<string> {
    console.time("Speculative-Loop");

    // --- STEP 1: THE DRAFT (Writer) ---
    console.log("⚡ [Drafting] Generating raw text with Groq (Llama 3)...");
    const draftResponse = await this.groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a fast technical writer. Write a comprehensive, verbose draft in Markdown. Focus on speed and quantity of information.",
        },
        {
          role: "user",
          content: `Context: ${context}\n\nTask: ${userPrompt}`,
        },
      ],
      model: "llama-3.1-8b-instant",
    });
    const rawDraft = draftResponse.choices[0]?.message?.content || "";

    // --- STEP 2: THE VERIFY (Editor) ---
    // console.log("🔍 [Verifying] Polishing with GPT-4o-mini...");
    // const polishedResponse = await this.openai.chat.completions.create({
    //   model: "gpt-4o-mini", // Cost-effective intelligence
    //   messages: [
    //     {
    //       role: "system",
    //       content: `You are a strict technical editor.
    //       1. Fix factual errors.
    //       2. Improve flow and tone (make it engaging).
    //       3. Ensure valid Markdown formatting.
    //       4. Do NOT shorten the content significantly.`,
    //     },
    //     { role: "user", content: `Review and fix this draft:\n\n${rawDraft}` },
    //   ],
    //   temperature: 0.3, // Keep edits focused
    // });

    // console.timeEnd("Speculative-Loop");
    // return polishedResponse.choices[0].message.content || "";

    // console.log("🔍 [Verifying] Swapping OpenAI for Gemini...");

    // const verificationPrompt = `
    //   You are a strict technical editor.
    //   Review and fix this draft. Return ONLY the fixed content.

    //   DRAFT:
    //   ${rawDraft}
    // `;

    // // Re-use your existing Gemini helper
    // return this.callGemini(verificationPrompt);

    console.log("⚠️ [Limit Reached] Skipping Verification Step.");
    console.timeEnd("Speculative-Loop");
    return rawDraft;
  }
  /**
   * SELF-HEALING GENERATOR
   * Generic S allows any Zod Schema (transforms, defaults, unions).
   * Returns z.infer<S> automatically.
   */
  /**
   * SELF-HEALING GENERATOR (Fixed JSON Parsing)
   */
  generateStructured = traceable(
    async <S extends ZodTypeAny>(
      prompt: string,
      schema: S,
      tier: TaskTier,
      maxRetries = 3,
    ): Promise<z.infer<S>> => {
      let currentPrompt = prompt;
      let attempts = 0;

      while (attempts <= maxRetries) {
        try {
          console.log(`🔄 [Attempt ${attempts + 1}] Generating structure...`);

          const rawResult = await this.generate(
            currentPrompt,
            tier,
            "IMPORTANT: Output STRICT JSON only. Do not use Markdown code blocks. Do not add any conversational text.",
          );

          // 1. Cleaner Logic
          const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error("No JSON object found in response");
          }

          const jsonString = jsonMatch[0];
          let parsedJson;

          try {
            parsedJson = JSON.parse(jsonString);
          } catch (e) {
            throw new Error("Invalid JSON syntax");
          }

          // 2. Validate with Zod
          const validation = schema.safeParse(parsedJson);

          // ✅ 3. THE MISSING PIECE: Check for success!
          if (validation.success) {
            console.log("✅ [Validation] Success!");
            return validation.data;
          }

          // 4. Validation Failed -> Trigger Healer
          console.warn("❌ [Validation] Failed. Triggering Self-Healing...");
          const errors = validation.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ");

          currentPrompt = `PREVIOUS OUTPUT WAS INVALID.\nERROR: ${errors}\nORIGINAL REQUEST: ${prompt}\nACTION: Fix the JSON structure and return ONLY the JSON.`;
          attempts++;
        } catch (error: any) {
          console.warn(`❌ [Attempt ${attempts + 1}] Error:`, error.message);

          if (error.message.includes("Max retries exceeded")) throw error;

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

// Export a singleton instance
export const modelGateway = new ModelGateway();
