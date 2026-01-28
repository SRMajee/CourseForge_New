import { useQuery } from "@tanstack/react-query";
import { getCourseById } from "~/services/courseService";

export const useCourse = (courseId?: string) => {
  return useQuery({
    queryKey: ["course", courseId],
    queryFn: () => {
      if (!courseId) throw new Error("Course ID required");
      return getCourseById(courseId);
    },
    enabled: !!courseId, // Only fetch if ID exists
  });
};