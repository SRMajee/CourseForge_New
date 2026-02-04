import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { COURSE_QUEUE_NAME, CourseGenerationJob } from "../queues/courseQueue";
import { courseService } from "../services/courseService";
import { socketService } from "../services/socketService";
import { User } from "../models/User";
import logger from "../utils/logger";

export const courseWorker = new Worker<CourseGenerationJob>(
  COURSE_QUEUE_NAME,
  async (job: Job<CourseGenerationJob>) => {
    const { userId, topic, action, userAnswers, mode } = job.data;
    let heartbeat: NodeJS.Timeout | null = null;

    // 1. Broadcast Setup
    const user = await User.findById(userId);
    const rooms = [userId];
    if (user?.auth0Id) rooms.push(user.auth0Id);
    if (user?.email) rooms.push(user.email);

    const broadcast = (event: string, data: any) => {
      rooms.forEach((room) => socketService.emitToUser(room, event, data));
    };

    try {
      logger.info(
        `⚙️ [Worker] Job ${job.id} started for ${userId} | Mode: ${mode || "standard"} | Action: ${action}`,
      );

      // 2. Notify Started
      broadcast("course_generation_started", {
        jobId: job.id,
        message: `Initializing Agentic Workflow (${mode})...`,
      });

      // 3. Heartbeat (UX Feedback & Keep-Alive)
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

        // A. Notify Frontend
        broadcast("job_progress", {
          jobId: job.id,
          status: "processing",
          message: baseMessages[msgIndex],
          progress: Math.floor(progress),
        });

        // B. ✅ FIX: Notify Redis/BullMQ that we are alive
        // This prevents the job from being marked as "stalled" during long Pro generations
        try {
          await job.updateProgress(progress);
        } catch (e) {
          // Ignore updates if job finished
        }

        tick++;
      }, 2000); // Slower tick (2s) to reduce socket noise

      // 4. Execute Logic with Timeout Race
      // ✅ FIX: Force timeout after 180s (3 mins) to prevent infinite hangs
      const PRO_TIMEOUT = 180000;

      const generationPromise = (async () => {
        if (action === "generate_outline" || action === "resume_course") {
          return await courseService.generateCourse(userId, topic, {
            userAnswers,
            mode,
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

      // Race the generation against the clock
      const result: any = await Promise.race([
        generationPromise,
        timeoutPromise,
      ]);

      // Stop Heartbeat
      if (heartbeat) clearInterval(heartbeat);

      // 5. Handle Success
      if (result) {
        logger.info(`✅ [Worker] Job ${job.id} DONE. Result ID: ${result._id}`);
        const payload = {
          jobId: job.id,
          courseId: result._id,
          title: result.title,
          message: "Course generated successfully!",
          result: result,
        };
        broadcast("course_generated", payload);
        broadcast("job_complete", payload);
      } else {
        throw new Error("Job finished with no result");
      }

      return result;
    } catch (error: any) {
      if (heartbeat) clearInterval(heartbeat);
      logger.error(`❌ [Worker] Job ${job.id} CRASHED:`, error);

      broadcast("course_generation_error", {
        jobId: job.id,
        message: error.message || "Deep reasoning process failed.",
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    // ✅ FIX: Increase Lock Duration to 5 minutes (300s)
    // Pro jobs take time. 60s is too short for DeepSeek/GPT-4 logic tiers.
    lockDuration: 300000,
    drainDelay: 5000, // Reduced slightly for responsiveness
  },
);
