import dotenv from "dotenv";
import { z } from "zod";

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("8080"),
  MONGO_URI: z.string().url(),
  OPENAI_API_KEY: z.string().min(1, "OpenAI API Key is required"),
  YOUTUBE_API_KEY: z.string().min(1, "YouTube API Key is required"),
  GEMINI_API_KEY: z.string().min(1, "Gemini API Key is required"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "Cloudinary Cloud Name is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "Cloudinary API Key is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "Cloudinary API Secret is required"),
  AUTH0_DOMAIN: z.string().min(1, "Auth0 Domain is required"),
  AUTH0_AUDIENCE: z.string().min(1, "Auth0 Audience is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "Stripe Webhook Secret is required"),
  STRIPE_SECRET_KEY: z.string().min(1, "Stripe Secret Key is required"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  LANGCHAIN_TRACING_V2: z
    .string()
    .transform((val) => val === "true")
    .default("false"),
  LANGCHAIN_API_KEY: z
    .string()
    .min(1, "LangChain API Key is required")
    .optional(),
  LANGCHAIN_PROJECT: z
    .string()
    .min(1, "LangChain Project is required")
    .optional(),
  LANGSMITH_ENDPOINT: z.string().url().optional(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  GROQ_API_KEY: z.string().min(1, "Groq API Key is required"),
  TAVILY_API_KEY: z.string().min(1, "Tavily API Key is required"),
  // 👇 BUSINESS LOGIC (Automatically transforms "10" -> 10)
  COST_CREATE_COURSE: z.string().transform(Number).default("10"),
  COST_GENERATE_LESSON: z.string().transform(Number).default("5"),
  COST_GENERATE_AUDIO: z.string().transform(Number).default("15"),
  COST_EXPORT_PDF: z.string().transform(Number).default("5"),

  // 👇 STRIPE PRODUCT CONFIG
  STRIPE_PRICE_ID_TOPUP: z.string().min(1, "Topup Price ID missing"),
  STRIPE_PRICE_ID_PRO: z.string().min(1, "Pro Price ID missing"),

  // 👇 DISPLAY PRICING (Optional, but good for sync)
  PRICE_TOPUP_INR: z.string().transform(Number).default("400"),
  CREDITS_TOPUP_AMOUNT: z.string().transform(Number).default("300"),
  PRICE_PRO_INR: z.string().transform(Number).default("999"),
  CREDITS_PRO_AMOUNT: z.string().transform(Number).default("1000"),
});

// Validate process.env
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(parsedEnv.error.format(), null, 4),
  );
  process.exit(1);
}

export const env = parsedEnv.data;
