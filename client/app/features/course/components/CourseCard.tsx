import {
  Box,
  Heading,
  Text,
  Badge,
  HStack,
  IconButton,
  Stack,
} from "@chakra-ui/react";
import { FaTrash, FaBookOpen, FaCalendarAlt } from "react-icons/fa";
import { useDeleteCourse } from "../hooks/useCourseMutations";
import { Link } from "react-router";
import type { Course } from "~/types/course";

// Helper to stop click propagation
const handleDelete = (e: React.MouseEvent, id: string, deleteFn: any) => {
  e.preventDefault();
  e.stopPropagation();
  if (
    confirm(
      "Are you sure you want to delete this course? This action cannot be undone.",
    )
  ) {
    deleteFn(id);
  }
};

export const CourseCard = ({ course }: { course: Course }) => {
  const { mutate: deleteCourse, isPending } = useDeleteCourse();
  // console.log("CourseCard rendering for course:", course);
  // Format date safely
  const createdDate = course.createdAt
    ? new Date(course.createdAt).toLocaleDateString()
    : "Unknown date";

  return (
    <Link to={`/course/${course._id}`} style={{ textDecoration: "none" }}>
      <Box
        className="group" // 👈 1. Add "group" class for hover targeting
        p={5}
        shadow="md"
        borderWidth="1px"
        borderRadius="lg"
        bg="bg.panel"
        transition="all 0.2s"
        _hover={{
          shadow: "lg",
          borderColor: "brand.500",
          transform: "translateY(-2px)",
        }}
        position="relative"
        h="full"
        display="flex"
        flexDirection="column"
      >
        {/* Top Row: Status Badge + Delete Button */}
        <HStack justify="flex-end" mb={3}>
          {/* <Badge colorPalette={course.isPublished ? "green" : "yellow"}>
            {course.isPublished ? "Published" : "Draft"}
          </Badge> */}

          {/* Delete Button - Hidden by default, Visible on Hover */}
          <IconButton
            aria-label="Delete Course"
            size="xs"
            colorPalette="red"
            variant="ghost"
            loading={isPending}
            onClick={(e) => handleDelete(e, course._id, deleteCourse)}
            opacity={0} // Hidden initially
            _groupHover={{ opacity: 1 }} // Visible when parent group is hovered
            transition="opacity 0.2s"
          >
            <FaTrash />
          </IconButton>
        </HStack>

        {/* Title & Description */}
        <Heading size="md" mb={2} truncate>
          {course.title}
        </Heading>

        <Text color="fg.muted" fontSize="sm" lineClamp={2} mb={4} flex="1">
          {course.description || "No description provided."}
        </Text>

        {/* Tags Row */}
        {course.tags && course.tags.length > 0 && (
          <HStack gap={2} mb={4} wrap="wrap">
            {course.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="surface" colorPalette="blue" size="sm">
                {tag}
              </Badge>
            ))}
            {course.tags.length > 3 && (
              <Text fontSize="xs" color="fg.muted">
                +{course.tags.length - 3} more
              </Text>
            )}
          </HStack>
        )}

        {/* Footer: Date & Module Count */}
        <HStack
          color="fg.subtle"
          fontSize="xs"
          pt={3}
          borderTopWidth="1px"
          borderColor="border.muted"
          justify="space-between"
        >
          <HStack>
            <FaBookOpen />
            <Text>{course.modules?.length || 0} Modules</Text>
          </HStack>

          <HStack>
            <FaCalendarAlt />
            <Text>{createdDate}</Text>
          </HStack>
        </HStack>
      </Box>
    </Link>
  );
};
