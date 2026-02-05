import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { COURSE_QUEUE_NAME, CourseGenerationJob } from "../queues/courseQueue";
import { courseService } from "../services/courseService";
// ❌ DELETE: import { socketService } ...
// ❌ DELETE: import { User } ...
import logger from "../utils/logger";

export const courseWorker = new Worker<CourseGenerationJob>(
  COURSE_QUEUE_NAME,
  async (job: Job<CourseGenerationJob>) => {
    const { userId, topic, action, userAnswers, mode, metadata } = job.data;
    let heartbeat: NodeJS.Timeout | null = null;

    try {
      logger.info(
        `⚙️ [Worker] Job ${job.id} started for ${userId} | Mode: ${mode || "standard"}`,
      );

      // ✅ 1. SIGNAL START via Redis (The Listener will pick this up)
      await job.updateProgress({
        userId,
        progress: 1,
        message: `Initializing Agentic Workflow (${mode})...`,
        status: "started", // 👈 This tells the API to emit 'course_generation_started'
      });

      // ✅ 2. Heartbeat (Updates Progress in Redis)
      const baseMessages = [
        "Analyzing curriculum standards...",
        "Structuring course modules...",
        "Drafting lesson plans...",
        "Validating technical accuracy...",
        "Refining pro-level insights...",
      ];

      let tick = 0;
      let progress = 5;

      heartbeat = setInterval(async () => {
        const increment = progress < 60 ? 10 : progress < 85 ? 5 : 1;
        progress = Math.min(progress + increment, 95);
        const msgIndex = tick % baseMessages.length;

        // Push update to Queue
        await job.updateProgress({
          userId,
          progress: Math.floor(progress),
          message: baseMessages[msgIndex],
          status: "processing",
        });

        tick++;
      }, 2000);

      // 3. Execution Logic
      const PRO_TIMEOUT = 180000; // 3 mins

      const generationPromise = (async () => {
        if (action === "generate_outline" || action === "resume_course") {
          return await courseService.generateCourse(userId, topic, {
            userAnswers,
            mode,
            paymentContext: metadata?.payment,
          });
        }
        throw new Error(`Unknown action: ${action}`);
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("AI Generation Timed Out")),
          PRO_TIMEOUT,
        ),
      );

      const result: any = await Promise.race([
        generationPromise,
        timeoutPromise,
      ]);

      if (heartbeat) clearInterval(heartbeat);

      if (result) {
        logger.info(`✅ [Worker] Job ${job.id} DONE.`);
        // ❌ NO socket emission here. Just return.
        return result;
      } else {
        throw new Error("Job finished with no result");
      }
    } catch (error: any) {
      if (heartbeat) clearInterval(heartbeat);
      logger.error(`❌ [Worker] Job ${job.id} CRASHED:`, error);

      // Signal Failure via Redis
      await job.updateProgress({
        userId,
        progress: 0,
        message: error.message || "Process failed.",
        status: "failed",
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 25,
    lockDuration: 300000,
    limiter: { max: 10, duration: 5000 },
  },
);
