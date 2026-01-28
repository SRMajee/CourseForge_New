import { z } from "zod";

export const clarificationSchema = z.object({
  isAmbiguous: z
    .boolean()
    .describe(
      "True if the topic is broad (e.g. 'Python', 'Marketing'). False if specific.",
    ),
  reason: z.string().optional().describe("Brief explanation for the user."),
  questions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        options: z.array(z.string()).default([]), // Allow empty for 'text' inputs
        type: z.enum(["choice", "text"]).default("choice"),
      }),
    )
    .default([])
    .describe("Questions to ask if ambiguous."),
});

export type ClarificationResponse = z.infer<typeof clarificationSchema>;
