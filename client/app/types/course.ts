import type { Lesson } from "./lesson";

export interface Module {
  _id: string;
  title: string;
  course: string; // Course ID
  lessons: Lesson[]; // Populated by API
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  userId: string;
  tags: string[];
  modules: Module[]; // Populated by API

  createdAt: string;
  updatedAt?: string;
}
