import { useMutation } from "@tanstack/react-query";
import { generateCourse } from "~/services/courseService";
import { toaster } from "~/components/ui/toaster";

export const useCreateCourse = () => {
  // ❌ REMOVED: const navigate = useNavigate();
  // The Modal handles navigation now via the Terminal.

  return useMutation({
    mutationFn: (topic: string) => generateCourse(topic),

    // ❌ REMOVED: onSuccess with navigate()
    // We let the component handle the 'jobId' response.

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
