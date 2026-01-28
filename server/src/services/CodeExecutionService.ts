// ✅ FIX 1: Use Default Import (fixes "No exported member" error)
import CodeInterpreter from "@e2b/code-interpreter";
import { modelGateway, TaskTier } from "./ModelGateway";
import logger from "../utils/logger";
import { z } from "zod";
import { env } from "../config/env";

// Schema for the AI Fixer response
const fixedCodeSchema = z.object({
  fixed_code: z.string().describe("The corrected, executable code snippet"),
  explanation: z
    .string()
    .optional()
    .describe("Brief explanation of what was fixed"),
});

export class CodeExecutionService {
  /**
   * Main entry point: Verify and Fix a code block
   * Currently optimized for Python, as E2B's CodeInterpreter specializes in it.
   */
  async verifyCodeBlock(codeBlock: {
    type: string;
    language: string;
    code: string;
  }) {
    // 1. Guard Clauses: Only check Code blocks
    if (codeBlock.type !== "code" || !codeBlock.code) return codeBlock;

    // 2. Filter Supported Languages (Python is E2B's superpower)
    const lang = (codeBlock.language || "").toLowerCase();
    if (lang !== "python") {
      // logger.info(`[Sandbox] Skipping ${lang} (Only Python supported for now)`);
      return codeBlock;
    }

    // 3. Check for API Key
    if (!process.env.E2B_API_KEY) {
      logger.warn("⚠️ E2B_API_KEY missing. Skipping code verification.");
      return codeBlock;
    }

    return this.runPythonLoop(codeBlock);
  }

  /**
   * The "Self-Healing" Execution Loop
   */
  private async runPythonLoop(codeBlock: any) {
    let currentCode = codeBlock.code;
    const maxRetries = 2; // Retry limit to prevent infinite loops
    let attempt = 0;

    // ✅ FIX 2: Use 'any' to bypass the "Property 'notebook' does not exist" TS error
    let sandbox: any;

    try {
      logger.info("🧪 [Sandbox] Initializing E2B for Python verification...");
      sandbox = await CodeInterpreter.create(); // Spins up a cloud micro-VM

      while (attempt <= maxRetries) {
        // A. Execute Code
        logger.info(`🧪 [Sandbox] Execution Attempt ${attempt + 1}...`);

        // Now 'notebook' property will be accepted because sandbox is 'any'
        const execResult = await sandbox.notebook.execCell(currentCode);

        // B. Check for Runtime Errors
        if (execResult.error) {
          // Capture full error details (Name, Value, Traceback)
          const errorMsg = `${execResult.error.name}: ${execResult.error.value}\n${execResult.error.traceback}`;
          logger.warn(`❌ [Sandbox] Code Failed:\n${errorMsg}`);

          if (attempt === maxRetries) {
            logger.error(
              "❌ [Sandbox] Max retries reached. Returning code as-is.",
            );
            break;
          }

          // C. The "Fix" Agent: Feed Error back to LLM
          logger.info("🔧 [Sandbox] Requesting AI Fix...");
          const fixPrompt = `
            You are a Python Expert debugging code.
            
            THE CODE:
            \`\`\`python
            ${currentCode}
            \`\`\`
            
            THE ERROR:
            ${errorMsg}
            
            TASK:
            Fix the code so it runs correctly in a standard Python notebook environment.
            Return ONLY the JSON structure.
          `;

          try {
            // Use your FAST_UTILITY Tier (Llama 3 via Groq) for speed
            const result = await modelGateway.generateStructured(
              fixPrompt,
              fixedCodeSchema,
              TaskTier.FAST_UTILITY,
            );

            currentCode = result.fixed_code;
            logger.info("✅ [Sandbox] AI provided a fix. Retrying...");
          } catch (aiError) {
            logger.error("AI Fix failed", aiError);
            break;
          }

          attempt++;
        } else {
          // D. Success!
          logger.info("✅ [Sandbox] Code Verified Successfully!");
          return {
            ...codeBlock,
            code: currentCode,
            isVerified: true, // Mark it so Frontend can show a "Verified" badge
          };
        }
      }
    } catch (err) {
      logger.error("❌ [Sandbox] Infrastructure Error:", err);
    } finally {
      // Always cleanup the sandbox to save resources
      if (sandbox) {
        await sandbox.close();
      }
    }

    // Fallback: Return the latest version of the code (even if unverified)
    return {
      ...codeBlock,
      code: currentCode,
      isVerified: false,
    };
  }
}

export const codeExecutionService = new CodeExecutionService();
