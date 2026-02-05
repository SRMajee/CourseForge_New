import { QueueEvents } from "bullmq";
import { redisConnection } from "../config/redis";
import { socketService } from "../services/socketService";
import { COURSE_QUEUE_NAME, courseQueue } from "../queues/courseQueue";
import logger from "../utils/logger";

export const setupQueueEvents = () => {
  // ✅ FIX: Use .duplicate() to create a dedicated connection for Listening
  // Redis cannot "listen" (sub) and "speak" (pub) on the same connection.
  const queueEvents = new QueueEvents(COURSE_QUEUE_NAME, {
    connection: redisConnection.duplicate(),
  });

  queueEvents.on("progress", ({ jobId, data }) => {
    // Debug log to confirm flow
    // logger.info(`📨 [Listener] Progress Event for ${jobId}`);

    if (typeof data === "object") {
      const { userId, progress, message, status } = data as any;

      // 1. Emit "Started" Event (Unsticks the 0%)
      if (status === "started") {
        socketService.emitToUser(userId, "course_generation_started", {
          jobId,
          message: message || "Starting...",
        });
      }

      // 2. Emit Standard Progress
      socketService.emitToUser(userId, "job_progress", {
        jobId,
        progress,
        message,
        status,
      });
    }
  });

  queueEvents.on("completed", ({ jobId, returnvalue }) => {
    const courseData = returnvalue as any;

    if (courseData && courseData.userId) {
      const payload = {
        jobId,
        courseId: courseData._id,
        title: courseData.title,
        message: "Course generated successfully!",
        result: courseData,
      };

      socketService.emitToUser(courseData.userId, "course_generated", payload);
      socketService.emitToUser(courseData.userId, "job_complete", payload);
    }
  });

  queueEvents.on("failed", async ({ jobId, failedReason }) => {
    logger.error(`❌ Job ${jobId} failed: ${failedReason}`);

    try {
      const job = await courseQueue.getJob(jobId);
      if (job && job.data.userId) {
        socketService.emitToUser(job.data.userId, "course_generation_error", {
          jobId,
          message: failedReason || "Generation failed.",
        });
      }
    } catch (err) {
      logger.error("Failed to relay error socket:", err);
    }
  });

  logger.info(`🎧 Queue Listener Active: ${COURSE_QUEUE_NAME}`);
};
