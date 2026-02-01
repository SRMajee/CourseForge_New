import type { Lesson } from "./lesson";

export interface Module {
  _id: string;
  title: string;
  course: string; // Course ID
  lessons: Lesson[]; // Populated by API
}

// ✅ NEW: Defines the shape of a history snapshot
export interface CourseHistorySnapshot {
  _id?: string;
  timestamp: string;
  instruction: string; // The prompt used for this version
  modules: string[]; // Array of Module IDs (snapshots are rarely fully populated by default)
  generationMode: "standard" | "pro";
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  userId: string;
  tags: string[];
  modules: Module[]; // Currently active modules (Populated)

  // ✅ Phase 1: UI & Logic Fields
  thumbnailUrl?: string;
  generationMode?: "standard" | "pro";
  feedback?: "like" | "dislike" | null;

  // ✅ Phase 4: History & Versioning
  history?: CourseHistorySnapshot[];

  createdAt: string;
  updatedAt?: string;
}
