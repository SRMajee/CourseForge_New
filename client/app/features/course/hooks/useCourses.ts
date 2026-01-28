import { useQuery } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "~/store/authStore";
import { getAllCourses } from "~/services/courseService";

export const useCourses = () => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["courses", user?._id],
    queryFn: getAllCourses, // 👈 Clean and simple again
    enabled: !isAuthLoading && isAuthenticated && !!user,
  });
};
