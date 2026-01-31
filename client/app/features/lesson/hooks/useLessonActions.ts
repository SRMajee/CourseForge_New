import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateLessonContent,
  searchYouTubeVideo,
  generateLessonAudio,
} from "~/services/lessonService";
import { toaster } from "~/components/ui/toaster";

export const useGenerateLesson = (courseId?: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => generateLessonContent(lessonId),
    onSuccess: () => {
      toaster.create({ title: "Lesson Generated!", type: "success" });
      if (courseId) {
        queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      }
      queryClient.invalidateQueries({ queryKey: ["lesson"] }); // Update lesson view
    },
    onError: (error) => {
      console.error(error);
      toaster.create({ title: "Generation Failed", type: "error" });
    },
  });
};

export const useVideoSearch = (query: string, enabled: boolean) => {
  return useQuery({
    queryKey: ["youtube", query],
    queryFn: () => searchYouTubeVideo(query),
    enabled: enabled && !!query,
    staleTime: 1000 * 60 * 60,
  });
};

// ✅ UPDATED: The only Audio hook you need now
export const useGenerateAudio = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lessonId,
      language,
    }: {
      lessonId: string;
      language: string;
    }) => {
      return generateLessonAudio(lessonId, language);
    },
    onSuccess: (data) => {
      // 'data' is now correctly typed as AudioResponse
      // toaster.create({
      //   title: "Audio Ready",
      //   description: `Now playing in ${data.language}`,
      //   type: "success",
      // });
      queryClient.invalidateQueries({ queryKey: ["lesson"] });
    },
    onError: (error) => {
      console.error(error);
      toaster.create({
        title: "Error",
        description: "Failed to generate audio.",
        type: "error",
      });
    },
  });
};
