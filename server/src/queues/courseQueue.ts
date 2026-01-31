import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import logger from "../utils/logger";

// Define strict typing for the Job
export interface CourseGenerationJob {
  userId: string;
  topic: string;
  action: "generate_outline" | "generate_lesson";

  // ✅ Phase 8 Updates:
  userAnswers?: any; // Stores the specific answers (Depth, Stack, Goal)
  skipClarification?: boolean; // Flag to bypass the ambiguity check in worker
  mode?: "standard" | "pro";
  metadata?: any; // For extra flags like 'pro_mode' later
}

export const COURSE_QUEUE_NAME = "course-generation";

export const courseQueue = new Queue<CourseGenerationJob>(COURSE_QUEUE_NAME, {
  connection: redisConnection,
});

logger.info(`🚀 Queue initialized: ${COURSE_QUEUE_NAME}`);
