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

/**
 * Course Generation Queue
 *
 * This queue handles background tasks related to course generation,
 * including outline creation, lesson content generation, and resuming
 * interrupted course generation processes.
 *
 * It is optimized for serverless environments with appropriate job
 * retention policies and retry mechanisms.
 */
export const courseQueue = new Queue<CourseGenerationJob>(COURSE_QUEUE_NAME, {
  connection: redisConnection,

  defaultJobOptions: {
    removeOnComplete: {
      age: 24 * 3600, // Keep for 24 hours
      count: 100, // Or keep max 100 entries
    },
    removeOnFail: {
      age: 24 * 3600 * 2, // Keep failed jobs longer (3 days) for debugging
      count: 200,
    },
    // Retry logic saves manual restarts
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

logger.info(
  `🚀 Queue initialized: ${COURSE_QUEUE_NAME} (Optimized for Serverless)`,
);
