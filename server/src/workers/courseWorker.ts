import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { COURSE_QUEUE_NAME, CourseGenerationJob } from "../queues/courseQueue";
import { courseService } from "../services/courseService";
import { socketService } from "../services/socketService";
import logger from "../utils/logger";

/**
 * The Background Worker
 * Handles: AI Generation, Database Saves, Socket Updates
 */
export const courseWorker = new Worker<CourseGenerationJob>(
  COURSE_QUEUE_NAME,
  async (job: Job<CourseGenerationJob>) => {
    const { userId, topic } = job.data;

    try {
      logger.info(`⚙️ [Worker] Job ${job.id} started for ${userId}`);

      // 1. Notify Frontend: Analysis
      socketService.emitToUser(userId, "job_progress", {
        jobId: job.id,
        status: "processing",
        message: `Analyzing topic: "${topic}"...`,
        progress: 10,
      });

      // Artificial delay so user sees the message (UX)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 2. Notify Frontend: Researching
      socketService.emitToUser(userId, "job_progress", {
        jobId: job.id,
        status: "processing",
        message: "Researching latest curriculum standards...",
        progress: 30,
      });

      // 3. EXECUTE THE HEAVY SERVICE
      // Note: We await this. It might take 10-40 seconds.
      const course = await courseService.generateCourse(userId, topic);

      // 4. Notify Frontend: Finalizing
      socketService.emitToUser(userId, "job_progress", {
        jobId: job.id,
        status: "processing",
        message: "Finalizing course structure...",
        progress: 90,
      });

      // 5. Notify Frontend: Complete
      // IMPORTANT: We send the 'result' (the course object) here
      socketService.emitToUser(userId, "job_complete", {
        jobId: job.id,
        status: "completed",
        message: "Course generated successfully!",
        result: course,
      });

      logger.info(`✅ [Worker] Job ${job.id} Completed`);
      return course;
    } catch (error: any) {
      logger.error(`❌ [Worker] Job ${job.id} Failed:`, error);

      // 6. Notify Frontend: Error
      socketService.emitToUser(userId, "job_error", {
        jobId: job.id,
        status: "failed",
        message: error.message || "Failed to generate course.",
      });

      throw error; // Let BullMQ handle retries if configured
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Handle 5 courses in parallel
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  },
);

// Graceful Shutdown
courseWorker.on("completed", (job) => {
  logger.info(`Job ${job.id} has completed!`);
});

courseWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} has failed with ${err.message}`);
});
