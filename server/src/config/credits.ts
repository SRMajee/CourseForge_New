import { env } from "./env";

export const CREDIT_COSTS = {
  CREATE_COURSE: env.COST_CREATE_COURSE,
  GENERATE_LESSON: env.COST_GENERATE_LESSON,
  GENERATE_AUDIO: env.COST_GENERATE_AUDIO,
  EXPORT_PDF: env.COST_EXPORT_PDF,
};
// The centralized Menu Object (Used by Frontend/API to display costs)
export const COST_MENU = [
  {
    action: "Create Course Outline",
    cost: CREDIT_COSTS.CREATE_COURSE,
    desc: "Generates modules & lesson titles",
  },
  {
    action: "Generate Lesson Content",
    cost: CREDIT_COSTS.GENERATE_LESSON,
    desc: "AI writes the full lesson text",
  },
  {
    action: "Generate Audio Summary",
    cost: CREDIT_COSTS.GENERATE_AUDIO,
    desc: "High-quality Neural TTS audio",
  },
  {
    action: "Export PDF",
    cost: CREDIT_COSTS.EXPORT_PDF,
    desc: "Downloadable course document",
  },
];
