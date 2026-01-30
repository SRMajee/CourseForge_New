import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "~/store/authStore";
import { getAllCourses } from "~/services/courseService";

// ✅ Accept page & limit arguments
export const useCourses = (page: number = 1, limit: number = 9) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { user } = useAuthStore();

  return useQuery({
    // ✅ Add page & limit to queryKey so it refetches when they change
    queryKey: ["courses", user?._id, page, limit],

    // ✅ Pass arguments to the fetcher function
    queryFn: () => getAllCourses(page, limit),

    // ✅ Keeps old data visible while fetching new page (prevents loading spinner flicker)
    placeholderData: keepPreviousData,

    enabled: !isAuthLoading && isAuthenticated && !!user,
  });
};
