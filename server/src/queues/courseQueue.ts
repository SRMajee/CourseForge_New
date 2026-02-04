import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import logger from "../utils/logger";

// Define strict typing for the Job
export interface CourseGenerationJob {
  userId: string;
  topic: string;
  action: "generate_outline" | "generate_lesson" | "resume_course";
  userAnswers?: any;
  skipClarification?: boolean;
  mode?: "standard" | "pro";
  metadata?: any;
}

export const COURSE_QUEUE_NAME = "course-generation";

export const courseQueue = new Queue<CourseGenerationJob>(COURSE_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    // ⚠️ CRITICAL OPTIMIZATION FOR FREE REDIS ⚠️
    // Auto-remove jobs from Redis once they are done/failed.
    // '100' means keep the last 100 jobs for debugging, delete the rest.
    // '1000' is the count limit.
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 100, // Or keep max 100 entries
    },
    removeOnFail: {
      age: 24 * 3600 * 3, // Keep failed jobs longer (3 days) for debugging
      count: 200,
    },
    // Retry logic saves manual restarts
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

logger.info(
  `🚀 Queue initialized: ${COURSE_QUEUE_NAME} (Optimized for Serverless)`,
);
