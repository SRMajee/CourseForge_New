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

// 6. Link Block (✅ ENSURE THIS IS PRESENT)
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
    LinkBlock, // 👈 This allows 'link' types to pass validation
  ]),
);

// 8. Main Response Schema
export const lessonResponseSchema = z.object({
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
    .describe("List of lessons in this module"),
});

export const outlineSchema = z.object({
  title: z.string().describe("The main title of the course"),
  description: z.string().describe("A brief engaging summary of the course"),
  tags: z.array(z.string()).describe("1-3 relevant topic tags"),
  modules: z
    .array(ModuleOutlineSchema)
    .min(1)
    .describe("A list of 1-3 modules"),
});

export type CourseOutline = z.infer<typeof outlineSchema>;
export type LessonResponse = z.infer<typeof lessonResponseSchema>;
