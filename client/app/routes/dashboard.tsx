import {
  Heading,
  Text,
  SimpleGrid,
  Center,
  Spinner,
  Box,
  VStack,
  HStack,
  Button,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import type { Route } from "./+types/dashboard";
import { useCourses } from "~/features/course/hooks/useCourses";
import { CourseCard } from "~/features/course/components/CourseCard";
import { useAuthStore } from "~/store/authStore";
import { CreateCourseModal } from "~/features/course/components/CreateCourseModal";
import { FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Dashboard" }];
}

export default function Dashboard() {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: isAuth0Loading,
  } = useAuth0();

  const { user } = useAuthStore();
  const displayName = user?.name || auth0User?.name || "User";
  const firstName = displayName.split(" ")[0];
  const navigate = useNavigate();

  // ✅ Pass page=1, limit=6 for dashboard preview
  const {
    data: response,
    isLoading: isCoursesLoading,
    isError,
  } = useCourses(1, 6);

  // ✅ Handle new response structure
  const courses = response?.data || [];

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!isAuth0Loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuth0Loading, isAuthenticated, navigate]);

  const isPageLoading =
    isAuth0Loading || !user || isCoursesLoading || response === undefined;

  if (isPageLoading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="50vh">
        <Text color="red.500">Failed to load courses.</Text>
      </Center>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <Box>
      <HStack justify="space-between" align="start" mb={8} wrap="wrap" gap={4}>
        <VStack align="start" gap={1}>
          <Heading size="2xl">Welcome back, {firstName}</Heading>
          <Text color="fg.muted" fontSize="lg">
            Ready to learn something new today?
          </Text>
        </VStack>

        <HStack gap={4}>
          <Button
            size="lg"
            colorPalette="blue"
            onClick={() => setModalOpen(true)}
          >
            <FaPlus /> New Course
          </Button>
        </HStack>
      </HStack>

      <Heading size="lg" mb={6}>
        Your Recent Courses
      </Heading>

      {courses?.length > 0 ? (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {courses?.map((course: any) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </SimpleGrid>
      ) : (
        <Center
          p={10}
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="border"
          borderRadius="lg"
          flexDirection="column"
          gap={4}
          bg="bg.subtle"
        >
          <Text color="fg.muted">No courses yet. Generate your first one!</Text>
          <Button variant="outline" onClick={() => setModalOpen(true)}>
            Create Course
          </Button>
        </Center>
      )}

      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Box>
  );
}
