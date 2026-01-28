import {
  Box,
  Heading,
  Text,
  VStack,
  Badge,
  HStack,
  Container,
  Separator,
  Card,
  Icon,
  IconButton,
} from "@chakra-ui/react";
import { useParams, Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getCourseById } from "~/services/courseService";
import {
  FaCheckCircle,
  FaPlayCircle,
  FaChevronRight,
  FaTrash,
} from "react-icons/fa";
import {
  useDeleteLesson,
  useDeleteModule,
} from "~/features/course/hooks/useCourseMutations";

export default function CourseDetail() {
  const { courseId } = useParams();

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId!),
    enabled: !!courseId,
  });

  // Pass courseId so the cache updates correctly after deletion
  const { mutate: deleteModule, isPending: isDeletingModule } = useDeleteModule(
    courseId!,
  );
  const { mutate: deleteLesson, isPending: isDeletingLesson } = useDeleteLesson(
    courseId!,
  );

  if (isLoading) return <Text p={10}>Loading course...</Text>;
  if (!course) return <Text p={10}>Course not found.</Text>;

  // Helper for safe deletion
  const handleSafeDelete = (
    e: React.MouseEvent,
    action: () => void,
    itemType: string,
  ) => {
    e.preventDefault(); // Stop Link navigation
    e.stopPropagation(); // Stop bubbling
    if (confirm(`Are you sure you want to delete this ${itemType}?`)) {
      action();
    }
  };

  return (
    <Container maxW="container.lg" py={8}>
      {/* Header Section */}
      <VStack align="start" gap={4} mb={8}>
        <HStack>
          {course.tags.map((tag: string) => (
            <Badge key={tag} colorPalette="blue" variant="solid">
              {tag}
            </Badge>
          ))}
        </HStack>
        <Heading size="3xl">{course.title}</Heading>
        <Text fontSize="xl" color="fg.muted">
          {course.description}
        </Text>
      </VStack>

      <Separator mb={8} />

      {/* Modules List */}
      <Heading size="lg" mb={6}>
        Course Content
      </Heading>

      <VStack align="stretch" gap={4}>
        {course.modules.map((module: any) => (
          <Card.Root
            key={module._id}
            variant="outline"
            overflow="hidden"
            className="group" // 1. Group for Module Hover
          >
            <Card.Header
              bg="bg.subtle"
              py={3}
              px={4}
            >
              <HStack justify="space-between" align="center" width="100%">
                <Heading size="sm">{module.title}</Heading>
                {/* Module Delete Button (Visible on Hover) */}
                <IconButton
                  aria-label="Delete Module"
                  size="xs"
                  colorPalette="red"
                  variant="ghost"
                  loading={isDeletingModule}
                  onClick={(e) =>
                    handleSafeDelete(e, () => deleteModule(module._id), "module")
                  }
                  opacity={0}
                  _groupHover={{ opacity: 1 }}
                  transition="opacity 0.2s"
                >
                  <FaTrash />
                </IconButton>
              </HStack>
            </Card.Header>

            <Card.Body p={0}>
              {module.lessons.map((lesson: any) => (
                <Box
                  key={lesson._id}
                  className="group/lesson" // 2. Nested Group for Lesson Hover
                  borderBottomWidth="1px"
                  _last={{ borderBottomWidth: 0 }}
                  _hover={{ bg: "gray.50", _dark: { bg: "gray.800" } }}
                >
                  <Link
                    to={`/course/${course._id}/lesson/${lesson._id}`}
                    style={{ display: "block", width: "100%" }}
                  >
                    <HStack p={4} justify="space-between">
                      {/* Left: Icon & Title */}
                      <HStack gap={3}>
                        <Icon
                          color={lesson.isEnriched ? "green.500" : "gray.400"}
                        >
                          {lesson.isEnriched ? (
                            <FaCheckCircle />
                          ) : (
                            <FaPlayCircle />
                          )}
                        </Icon>
                        <Text fontWeight="medium">{lesson.title}</Text>
                      </HStack>

                      {/* Right: Delete & Chevron */}
                      <HStack>
                        {/* Lesson Delete Button */}
                        <IconButton
                          aria-label="Delete Lesson"
                          size="xs"
                          colorPalette="red"
                          variant="ghost"
                          loading={isDeletingLesson}
                          onClick={(e) =>
                            handleSafeDelete(
                              e,
                              () => deleteLesson(lesson._id),
                              "lesson",
                            )
                          }
                          opacity={0}
                          _groupHover={{ opacity: 1 }} // Works because of "group/lesson" class
                          transition="opacity 0.2s"
                        >
                          <FaTrash />
                        </IconButton>

                        <Icon color="fg.muted" fontSize="sm">
                          <FaChevronRight />
                        </Icon>
                      </HStack>
                    </HStack>
                  </Link>
                </Box>
              ))}

              {module.lessons.length === 0 && (
                <Text p={4} fontSize="sm" color="fg.muted" fontStyle="italic">
                  No lessons in this module yet.
                </Text>
              )}
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>
    </Container>
  );
}
