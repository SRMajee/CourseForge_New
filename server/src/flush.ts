// src/flush.ts
import { courseQueue } from "./queues/courseQueue";

const flush = async () => {
  console.log("🔥 Obliterating Queue...");
  await courseQueue.obliterate({ force: true });
  console.log("✅ Queue flushed. No more zombie jobs.");
  process.exit(0);
};

flush();