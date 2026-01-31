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
    const { userId, topic, action, userAnswers } = job.data;
    let heartbeat: NodeJS.Timeout | null = null;

    try {
      logger.info(`⚙️ [Worker] Job ${job.id} started for ${userId}`);

      // 1. Broadcast Setup
      const user = await User.findById(userId);
      const rooms = [userId];
      if (user?.auth0Id) rooms.push(user.auth0Id);
      if (user?.email) rooms.push(user.email);

      const broadcast = (event: string, data: any) => {
        rooms.forEach((room) => socketService.emitToUser(room, event, data));
      };

      // 2. Notify Started
      broadcast("course_generation_started", {
        jobId: job.id,
        message: `Analyzing topic: "${topic}"...`,
      });

      // ✅ UX UPGRADE: Dynamic "Real" Feedback Loop
      // Extract user choices to show them back in the UI
      const answerValues = userAnswers
        ? Object.values(userAnswers).filter(
            (a) => typeof a === "string" && a.length > 1 && !a.includes("Skip"),
          )
        : [];

      const baseMessages = [
        "Analyzing curriculum standards...",
        "Structuring course modules...",
        "Drafting lesson plans...",
        "Validating technical accuracy...",
      ];

      let tick = 0;
      let progress = 5;

      heartbeat = setInterval(() => {
        // Non-linear progress (Fast start, slows near the end)
        const increment = progress < 60 ? 10 : progress < 85 ? 5 : 1;
        progress = Math.min(progress + increment, 95);

        // Logic: Cycle between "System Action" and "User Context"
        let currentMessage = baseMessages[tick % baseMessages.length];

        // Every 2nd tick, show a specific user choice to make it feel "tailored"
        if (answerValues.length > 0 && tick % 2 !== 0) {
          const answerIndex = Math.floor(tick / 2) % answerValues.length;
          currentMessage = `Tailoring content for: "${answerValues[answerIndex]}"...`;
        }

        broadcast("job_progress", {
          jobId: job.id,
          status: "processing",
          message: currentMessage,
          progress: Math.floor(progress),
        });

        tick++;
      }, 1500); // Update every 1.5s

      // 3. Execute Service
      let result;
      if (action === "generate_outline") {
        result = await courseService.generateCourse(userId, topic, {
          userAnswers,
        });
      }

      // Stop Heartbeat
      if (heartbeat) clearInterval(heartbeat);

      // 4. Notify Completion
      if (result) {
        logger.info(
          `✅ [Worker] Job ${job.id} DONE. Broadcasting to: ${rooms.join(", ")}`,
        );

        const payload = {
          jobId: job.id,
          courseId: result._id,
          title: result.title,
          message: "Course generated successfully!",
          result: result,
        };

        broadcast("course_generated", payload);
        broadcast("job_complete", payload);
      }

      return result;
    } catch (error: any) {
      if (heartbeat) clearInterval(heartbeat);
      logger.error(`❌ [Worker] Job ${job.id} Failed:`, error);

      const user = await User.findById(userId);
      const rooms = [userId];
      if (user?.auth0Id) rooms.push(user.auth0Id);
      if (user?.email) rooms.push(user.email);

      rooms.forEach((room) => {
        socketService.emitToUser(room, "course_generation_error", {
          jobId: job.id,
          message: error.message || "Failed to generate course.",
        });
      });

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
    lockDuration: 60000,
  },
);

courseWorker.on("completed", (job) =>
  logger.info(`Job ${job.id} has completed!`),
);
courseWorker.on("failed", (job, err) =>
  logger.error(`Job ${job?.id} has failed with ${err.message}`),
);
