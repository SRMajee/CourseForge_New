import { z } from "zod";

// 1. Heading Block
const HeadingBlock = z.object({
  type: z.enum(["heading"]),
  text: z.string(),
});

// 2. Paragraph Block
const ParagraphBlock = z.object({
  type: z.enum(["paragraph"]),
  text: z.string(),
});

// 3. Code Block
const CodeBlock = z
  .object({
    type: z.enum(["code"]),
    language: z.string().optional().default("javascript"),
    code: z.string().optional(),
    text: z.string().optional(),
  })
  .transform((data) => ({
    type: "code" as const,
    language: data.language,
    code: data.code || data.text || "",
  }));

// 4. Video Block
const VideoBlock = z
  .object({
    type: z.enum(["video", "query"]),
    query: z.string(),
  })
  .transform((data) => ({
    type: "video" as const,
    query: data.query,
  }));

// 5. MCQ Block
const MCQBlock = z
  .object({
    type: z.enum(["mcq", "question"]),
    question: z.string(),
    options: z.array(z.string()),
    answer: z.number(),
    explanation: z.string(),
  })
  .transform((data) => ({
    type: "mcq" as const,
    question: data.question,
    options: data.options,
    answer: data.answer,
    explanation: data.explanation,
  }));

// 6. Link Block
const LinkBlock = z.object({
  type: z.enum(["link"]),
  title: z.string().describe("The clickable text for the link"),
  url: z.string().url().describe("The valid external URL"),
  description: z
    .string()
    .optional()
    .describe("Why the student should read this"),
});

// 7. Content Array
const ContentSchema = z.array(
  z.union([
    HeadingBlock,
    ParagraphBlock,
    CodeBlock,
    VideoBlock,
    MCQBlock,
    LinkBlock,
  ]),
);

// ✅ 8. Main Response Schema (Updated with CoT)
export const lessonResponseSchema = z.object({
  _thought: z
    .string()
    .optional()
    .describe("Internal reasoning for the lesson flow"), // 👈 New Field
  title: z.string(),
  objectives: z.array(z.string()),
  content: ContentSchema,
});

// --- Outline Schemas (for course generation) ---

const LessonOutlineSchema = z.object({
  title: z.string().describe("The title of the lesson"),
});

const ModuleOutlineSchema = z.object({
  title: z.string().describe("The title of the module"),
  lessons: z
    .array(LessonOutlineSchema)
    .min(3)
    .describe("List of lessons in this module"),
});

// ✅ Updated Outline Schema (Updated with CoT)
export const outlineSchema = z.object({
  _thought: z
    .string()
    .optional()
    .describe("Internal reasoning for the course structure"), // 👈 New Field
  title: z.string().describe("The main title of the course"),
  description: z.string().describe("A brief engaging summary of the course"),
  tags: z.array(z.string()).describe("2-5 relevant topic tags"),
  modules: z
    .array(ModuleOutlineSchema)
    .min(6)
    .describe("A list of 3-6 modules"),
});

export type CourseOutline = z.infer<typeof outlineSchema>;
export type LessonResponse = z.infer<typeof lessonResponseSchema>;
