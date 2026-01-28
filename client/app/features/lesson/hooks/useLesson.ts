import { useQuery } from "@tanstack/react-query";
import { getLessonById } from "~/services/lessonService";

export const useLesson = (lessonId?: string) => {
  return useQuery({
    queryKey: ["lesson", lessonId], // Specific key for this lesson
    queryFn: () => {
      if (!lessonId) throw new Error("Lesson ID required");
      return getLessonById(lessonId);
    },
    enabled: !!lessonId, // Only run if ID is present
  });
};
