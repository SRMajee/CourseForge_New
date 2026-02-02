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
  resumeCourse,
  downloadLessonPDF,
  executeCode,
  saveLessonCode,
  regenerateCourseStructure,
  refineLessonContent,
  getCourseVersion,
  getLessonVersion,
  downloadModulePDF,
  downloadCoursePDF,
} from "../controllers/courseController";

const router = Router();

// 1. Generate the Outline (Course + Modules + Lesson Titles)
router.post("/outline", generateCourseOutline);
router.post("/resume", resumeCourse);
// 2. Lazy Load / Generate specific lesson content
router.post("/lessons/:lessonId/generate", generateLessonContent);
router.post("/lessons/:lessonId/pdf", downloadLessonPDF); // 👈 New PDF Route
// 3. Get Full Course
router.get("/:id", getCourse);

// 4. Get All Courses
router.get("/", getAllCourses);

// 5. Get Lesson by id
router.get("/lessons/:lessonId", getLesson);

// 6. Delete Course by id
router.delete("/:courseId", deleteCourse);
router.post("/:courseId/regenerate", regenerateCourseStructure); // Changed to POST for actionrouter.delete("/modules/:moduleId", deleteModule);
router.delete("/lessons/:lessonId", deleteLesson);
router.post("/execute", executeCode);
router.patch("/lessons/:lessonId/code", saveLessonCode);
router.post("/lessons/:lessonId/refine", refineLessonContent);
router.get("/:courseId/history/:versionIndex", getCourseVersion);
router.get("/lessons/:lessonId/history/:versionIndex", getLessonVersion); 
router.post("/modules/:moduleId/pdf", downloadModulePDF); // ✅ NEW Route
router.post("/:courseId/pdf", downloadCoursePDF);
export default router;
