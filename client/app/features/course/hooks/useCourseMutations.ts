import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CourseService } from "~/services/courseService";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/services/api";

interface GenerateOutlineResponse {
  message: string;
  jobId: string; // 👈 The critical piece we need
  status: string;
  queuePosition?: number;
}

export const useGenerateCourseOutline = () => {
  return useMutation({
    mutationFn: async (topic: string) => {
      const { data } = await api.post<GenerateOutlineResponse>(
        "/courses/outline",
        { topic },
      );
      return data;
    },
    onError: (error: any) => {
      toaster.create({
        title: "Generation Failed",
        description:
          error.response?.data?.message || "Could not start course generation.",
        type: "error",
      });
    },
    // We don't invalidate queries yet because the course isn't ready.
    // The Socket event will tell us when to refresh.
  });
};
export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: CourseService.deleteCourse,
    onSuccess: () => {
      toaster.create({ title: "Course deleted", type: "success" });
      // Refresh the Dashboard list
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
    onError: () => {
      toaster.create({ title: "Failed to delete course", type: "error" });
    },
  });
};

export const useDeleteModule = (courseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: CourseService.deleteModule,
    onSuccess: () => {
      toaster.create({ title: "Module deleted", type: "success" });
      // Refresh the specific Course Detail view
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    },
    onError: () => {
      toaster.create({ title: "Failed to delete module", type: "error" });
    },
  });
};

export const useDeleteLesson = (courseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: CourseService.deleteLesson,
    onSuccess: () => {
      toaster.create({ title: "Lesson deleted", type: "success" });
      // Refresh the specific Course Detail view
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
    },
    onError: () => {
      toaster.create({ title: "Failed to delete lesson", type: "error" });
    },
  });
};
