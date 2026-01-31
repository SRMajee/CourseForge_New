import { api } from "~/services/api";
import type { Course } from "~/types/course";

// 1. Generate a New Course Outline
export const generateCourse = async (topic: string): Promise<Course> => {
  const { data } = await api.post<Course>("/courses/outline", { topic });
  return data;
};

// 2. Get Single Course by ID
export const getCourseById = async (id: string): Promise<Course> => {
  const { data } = await api.get<Course>(`/courses/${id}`);
  return data;
};
export const deductPDFCredits = async (lessonId: string) => {
  const { data } = await api.post(`/courses/lessons/${lessonId}/pdf`);
  return data;
};
// 3. Get All Courses
// ✅ Update to accept page & limit (defaults match backend)
export const getAllCourses = async (page = 1, limit = 9) => {
  const { data } = await api.get(`/courses?page=${page}&limit=${limit}`);
  return data; // Returns { data: [...], meta: {...} }
};

export const deleteCourse = async (courseId: string) => {
  const { data } = await api.delete(`/courses/${courseId}`);
  return data;
};
export const executeCode = async (language: string, code: string) => {
  const { data } = await api.post("/courses/execute", { language, code });
  return data;
};
export const deleteModule = async (moduleId: string) => {
  const { data } = await api.delete(`/courses/modules/${moduleId}`);
  return data;
};

export const deleteLesson = async (lessonId: string) => {
  const { data } = await api.delete(`/courses/lessons/${lessonId}`);
  return data;
};
// ✅ NEW: Accept output argument
export const saveCode = async (
  lessonId: string,
  blockIndex: number,
  code: string,
  output?: string,
) => {
  const { data } = await api.patch(`/courses/lessons/${lessonId}/code`, {
    blockIndex,
    code,
    output, // 👈 Send output to backend
  });
  return data;
};
export class CourseService {
  static generateCourse = generateCourse;
  static getCourseById = getCourseById;
  static getAllCourses = getAllCourses;
  static deleteCourse = deleteCourse;
  static deleteModule = deleteModule;
  static deleteLesson = deleteLesson;
  static deductPDFCredits = deductPDFCredits;
  static executeCode = executeCode;
  static saveCode = saveCode;
}
