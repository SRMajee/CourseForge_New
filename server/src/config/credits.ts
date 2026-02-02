import { env } from "./env";

export const CREDIT_COSTS = {
  CREATE_COURSE: env.COST_CREATE_COURSE,
  CREATE_COURSE_PRO: env.COST_CREATE_COURSE_PRO,
  GENERATE_LESSON_PRO: env.COST_GENERATE_LESSON_PRO,
  GENERATE_LESSON: env.COST_GENERATE_LESSON,
  GENERATE_AUDIO: env.COST_GENERATE_AUDIO,
  EXPORT_PDF: env.COST_EXPORT_PDF,
  COST_REGENERATE_COURSE: env.COST_REGENERATE_COURSE,
  COST_REGENERATE_COURSE_PRO: env.COST_REGENERATE_COURSE_PRO,
  COST_REGENERATE_LESSON: env.COST_REGENERATE_LESSON,
  COST_REGENERATE_LESSON_PRO: env.COST_REGENERATE_LESSON_PRO,
};
// The centralized Menu Object (Used by Frontend/API to display costs)
export const COST_MENU = [
  {
    action: "Create Course Outline PRO",
    cost: CREDIT_COSTS.CREATE_COURSE_PRO,
    desc: "Generates modules & lesson titles  Pro",
  },
  {
    action: "Create Course Outline",
    cost: CREDIT_COSTS.CREATE_COURSE,
    desc: "Generates modules & lesson titles Non Pro",
  },
  {
    action: "Regenerate Course Structure PRO",
    cost: CREDIT_COSTS.COST_REGENERATE_COURSE_PRO,
    desc: "Regenerate modules & lesson titles Pro",
  },
  {
    action: "Regenerate Course Structure",
    cost: CREDIT_COSTS.COST_REGENERATE_COURSE,
    desc: "Regenerate modules & lesson titles Non Pro",
  },
  {
    action: "Generate Lesson Content PRO",
    cost: CREDIT_COSTS.GENERATE_LESSON_PRO,
    desc: "AI writes the full lesson text Pro",
  },
  {
    action: "Generate Lesson Content",
    cost: CREDIT_COSTS.GENERATE_LESSON,
    desc: "AI writes the full lesson text",
  },
  {
    action: "Regenerate Lesson Content PRO",
    cost: CREDIT_COSTS.COST_REGENERATE_LESSON_PRO,
    desc: "Rewrites the lesson content Pro",
  },
  {
    action: "Regenerate Lesson Content",
    cost: CREDIT_COSTS.COST_REGENERATE_LESSON,
    desc: "Rewrites the lesson content Non Pro",
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
