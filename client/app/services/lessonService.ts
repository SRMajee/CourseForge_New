import { api } from "~/services/api";
import type { Lesson } from "~/types/lesson";

export const getLessonById = async (lessonId: string): Promise<Lesson> => {
  const { data } = await api.get<Lesson>(`/courses/lessons/${lessonId}`);
  return data;
};

export const generateLessonContent = async (
  lessonId: string,
): Promise<Lesson> => {
  const { data } = await api.post<Lesson>(
    `/courses/lessons/${lessonId}/generate`,
  );
  return data;
};

export const searchYouTubeVideo = async (query: string) => {
  const { data } = await api.get<{
    videoId: string;
    title: string;
    thumbnail: string;
  }>(`/media/youtube`, { params: { q: query } });
  return data;
};
interface AudioResponse {
  audioUrl: string;
  language: string;
  script?: string;
}
// ✅ UPDATED: Audio generation now just takes an ID and returns the Cloudinary URL
export const generateLessonAudio = async (
  lessonId: string,
  language: string,
) => {
  // Pass the interface to api.post so TypeScript knows what 'data' contains
  const { data } = await api.post<AudioResponse>(
    `/media/audio/${lessonId}?lang=${language}`,
  );
  return data;
};

export const LessonService = {
  getLessonById,
  generateLessonContent,
  searchYouTubeVideo,
  generateLessonAudio,
};
