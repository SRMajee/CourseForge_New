import axios from "axios";
import { env } from "../config/env";
import logger from "../utils/logger";
import cloudinary from "../config/cloudinary";
import { Readable } from "stream";

// 1. Config for Languages
export const SUPPORTED_LANGUAGES = {
  en: {
    label: "English",
    geminiPrompt: "clear, simple, and engaging English suitable for a student",
    ttsCode: "en",
  },
  hinglish: {
    label: "Hinglish",
    geminiPrompt:
      "conversational 'Hinglish' (Hindi + English mix) like a friendly Indian tutor",
    ttsCode: "hi",
  },
  hi: {
    label: "Hindi",
    geminiPrompt: "pure, formal, and grammatically correct Hindi",
    ttsCode: "hi",
  },
  ta: {
    label: "Tamil",
    geminiPrompt: "clear and formal Tamil",
    ttsCode: "ta",
  },
  es: {
    label: "Spanish",
    geminiPrompt: "clear and engaging Spanish",
    ttsCode: "es",
  },
  bn: {
    label: "Bengali",
    geminiPrompt: "natural, clear, and formal Bengali suitable for a student",
    ttsCode: "bn",
  },
  ja: {
    label: "Japanese",
    geminiPrompt: "polite, clear, and natural Japanese suitable for a student",
    ttsCode: "ja",
  },
};

export type LanguageKey = keyof typeof SUPPORTED_LANGUAGES;

export class LanguageService {
  private activeModel: string | null = null;

  constructor() {
    if (!env.GEMINI_API_KEY) {
      logger.error("CRITICAL: GEMINI_API_KEY is missing in .env");
    }
  }

  private async getWorkingModel(): Promise<string> {
    // 1. Return cached model if we found one earlier
    if (this.activeModel) return this.activeModel;

    const apiKey = env.GEMINI_API_KEY;
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
      logger.info("🔍 Discovery: Fetching available Gemini models...");

      const response = await axios.get(listUrl);
      const models = response.data?.models || [];

      // 2. Filter for models that support 'generateContent'
      // 🛑 CRITICAL FIX: Exclude TTS/Audio models for TEXT tasks
      const availableModels = models.filter(
        (m: any) =>
          m.supportedGenerationMethods?.includes("generateContent") &&
          !m.name.includes("tts") &&
          !m.name.includes("audio"),
      );

      // Clean up names (API returns "models/gemini-pro", we just want "gemini-pro")
      const modelNames = availableModels.map((m: any) =>
        m.name.replace("models/", ""),
      );

      logger.info(`✅ Available Text Models: [${modelNames.join(", ")}]`);

      if (availableModels.length === 0) {
        throw new Error(
          "No text generation models available. Ensure Generative Language API is enabled.",
        );
      }

      // 3. Selection Strategy: Prefer 'flash', then 'pro', then whatever works
      let selected = modelNames.find((name: string) => name.includes("flash"));
      if (!selected)
        selected = modelNames.find((name: string) => name.includes("pro"));
      if (!selected) selected = modelNames[0];

      logger.info(`🎯 Selected Model: ${selected}`);
      this.activeModel = selected;
      return selected as string;
    } catch (error: any) {
      logger.error(
        "❌ Model Discovery Failed:",
        error.response?.data || error.message,
      );
      // Fallback if discovery fails completely
      return "gemini-1.5-flash";
    }
  }

  async generateScript(
    text: string,
    langKey: LanguageKey = "hinglish",
  ): Promise<string> {
    try {
      // 1. Get a valid model dynamically
      const modelName = await this.getWorkingModel();

      const apiKey = env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const langConfig =
        SUPPORTED_LANGUAGES[langKey] || SUPPORTED_LANGUAGES.hinglish;

      logger.info(
        `🤖 Generative AI: Sending request to ${modelName} for ${langKey}...`,
      );

      const payload = {
        contents: [
          {
            parts: [
              {
                text: `
              You are an expert teacher. 
              Summarize the following technical lesson into a short audio script in ${langConfig.geminiPrompt}.
              
              Rules:
              1. Keep it under 200 characters (CRITICAL for audio generation).
              2. Capture the main core concept only.
              3. Use natural spoken style.
              4. Do not include markdown or emojis, just text to be spoken.
              
              Input Text: "${text}"
            `,
              },
            ],
          },
        ],
      };

      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });

      const translated =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!translated) throw new Error("Empty response from Gemini");

      return translated.replace(/["\n*]/g, " ").trim();
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        logger.error("❌ Gemini Axios Error:");
        logger.error(`   - Status: ${error.response?.status}`);
        if (error.response?.data) {
          logger.error(
            `   - API Message: ${JSON.stringify(error.response.data, null, 2)}`,
          );
        }
      } else {
        logger.error("❌ Gemini Generic Error:", error);
      }
      throw new Error("Translation failed");
    }
  }

  /**
   * ⚡ FIXED: Added Chunking to prevent 400 Bad Request on long text
   */
  async generateAudio(text: string, langCode: string = "hi"): Promise<Buffer> {
    try {
      // Free TTS Limit is ~200 chars. Split text if needed.
      const MAX_CHUNK_LENGTH = 180;
      const chunks = this.chunkText(text, MAX_CHUNK_LENGTH);

      logger.info(
        `🎙️ Generating Audio: ${text.length} chars -> ${chunks.length} chunks`,
      );

      const audioBuffers = await Promise.all(
        chunks.map(async (chunk) => {
          const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${langCode}&client=tw-ob`;
          const response = await axios.get(url, {
            responseType: "arraybuffer",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
          });
          return Buffer.from(response.data);
        }),
      );

      return Buffer.concat(audioBuffers);
    } catch (error) {
      logger.error("Free TTS Failed:", error);
      throw error;
    }
  }

  /**
   * Helper to split text by punctuation/spaces without cutting words
   */
  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) return [text];

    const chunks: string[] = [];
    let currentChunk = "";

    // Split by sentence ending punctuation first, then spaces
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += sentence;
      } else {
        // If current chunk is full, push it
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;

        // If the single sentence is STILL too long, split by spaces
        if (currentChunk.length > maxLength) {
          const words = currentChunk.split(" ");
          currentChunk = "";
          for (const word of words) {
            if ((currentChunk + " " + word).length <= maxLength) {
              currentChunk += (currentChunk ? " " : "") + word;
            } else {
              chunks.push(currentChunk.trim());
              currentChunk = word;
            }
          }
        }
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
  }

  async uploadAudioToCloudinary(
    audioBuffer: Buffer,
    folder = "courseforge/audio",
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: folder,
          format: "wav",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result!.secure_url);
        },
      );
      Readable.from(audioBuffer).pipe(uploadStream);
    });
  }
}

export const languageService = new LanguageService();
