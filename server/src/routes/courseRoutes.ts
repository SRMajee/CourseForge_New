import { Router } from "express";
import {
  generateCourseOutline,
  getCourse,
  generateLessonContent,
  getAllCourses,
  getLesson,
  deleteCourse,
  deleteModule,
  deleteLesson,
} from "../controllers/courseController";
import { get } from "node:http";

const router = Router();

// 1. Generate the Outline (Course + Modules + Lesson Titles)
router.post("/outline", generateCourseOutline);

// 2. Lazy Load / Generate specific lesson content
router.post("/lessons/:lessonId/generate", generateLessonContent);

// 3. Get Full Course
router.get("/:id", getCourse);

// 4. Get All Courses
router.get("/", getAllCourses);

// 5. Get Lesson by id
router.get("/lessons/:lessonId", getLesson);

// 6. Delete Course by id
router.delete("/:courseId", deleteCourse);
router.delete("/modules/:moduleId", deleteModule);
router.delete("/lessons/:lessonId", deleteLesson);
export default router;
