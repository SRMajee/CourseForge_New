import { useMutation } from "@tanstack/react-query";
import { generateCourse } from "~/services/courseService";
import { toaster } from "~/components/ui/toaster";

export const useCreateCourse = () => {
  // ❌ REMOVED: const navigate = useNavigate();

  return useMutation({
    // ✅ UPDATE: Accept object payload matching the service
    mutationFn: (payload: { topic: string; mode?: "standard" | "pro" }) =>
      generateCourse(payload),

    // ❌ REMOVED: onSuccess with navigate()

    onError: (error: any) => {
      console.error(error);
      toaster.create({
        title: "Generation Failed",
        description: error.response?.data?.message || "Server error",
        type: "error",
      });
    },
  });
};
