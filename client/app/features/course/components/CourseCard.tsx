import {
  Box,
  Heading,
  Text,
  Badge,
  HStack,
  IconButton,
  Icon,
  AspectRatio,
  VStack,
  Image,
} from "@chakra-ui/react";
import { FaTrash, FaBookOpen } from "react-icons/fa";
import { useDeleteCourse } from "../hooks/useCourseMutations";
import { Link } from "react-router";
import type { Course } from "~/types/course";

const handleDelete = (e: React.MouseEvent, id: string, deleteFn: any) => {
  e.preventDefault();
  e.stopPropagation();
  if (confirm("Delete this course?")) deleteFn(id);
};

export const CourseCard = ({ course }: { course: Course }) => {
  const { mutate: deleteCourse, isPending } = useDeleteCourse();
  const isPro = course.generationMode === "pro";
  // console.log("Course Data:", course);

  return (
    <Link to={`/course/${course._id}`} style={{ textDecoration: "none" }}>
      <Box
        className="group"
        position="relative"
        borderRadius="2xl"
        overflow="hidden"
        bg="gray.900"
        shadow="lg"
        transition="all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)"
        _hover={{
          transform: "translateY(-4px)",
          shadow: "2xl",
          zIndex: 10,
        }}
      >
        <AspectRatio ratio={16 / 9}>
          <Box position="relative" overflow="hidden" w="full" h="full">
            {/* 1. BACKGROUND IMAGE */}
            {/* Using Image component is more robust for URLs than bgImage */}
            {course.thumbnailUrl ? (
              <Image
                src={course.thumbnailUrl}
                alt={course.title}
                objectFit="cover"
                w="full"
                h="full"
                position="absolute"
                inset="0"
                transition="transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)"
                _groupHover={{ transform: "scale(1.1)" }}
              />
            ) : (
              // Fallback Gradient
              <Box
                w="full"
                h="full"
                position="absolute"
                inset="0"
                bgGradient="linear(to-br, gray.800, gray.900)"
              />
            )}

            {/* 2. GRADIENT OVERLAY (Text Readability) */}
            <Box
              position="absolute"
              inset="0"
              bgGradient="linear(to-t, blackAlpha.900 0%, blackAlpha.600 50%, transparent 100%)"
              opacity={0.9}
              transition="opacity 0.3s"
              pointerEvents="none" // Ensure clicks pass through
            />

            {/* 3. FLOATING BADGES */}
            <HStack
              position="absolute"
              top={3}
              left={3}
              right={3}
              justify="space-between"
              zIndex={2}
            >
              {isPro ? (
                <Badge
                  colorPalette="purple"
                  variant="solid"
                  size="xs"
                  px={2}
                  rounded="md"
                  bg="purple.600"
                  color="white"
                  boxShadow="0 2px 10px rgba(0,0,0,0.5)"
                >
                  PRO
                </Badge>
              ) : (
                <Box /> // Spacer
              )}

              <IconButton
                aria-label="Delete"
                size="xs"
                colorPalette="red"
                variant="solid"
                bg="red.500/80"
                loading={isPending}
                onClick={(e) => handleDelete(e, course._id, deleteCourse)}
                opacity={0}
                _groupHover={{ opacity: 1 }}
                transition="opacity 0.2s"
                rounded="full"
                _hover={{ bg: "red.600", transform: "scale(1.1)" }}
              >
                <FaTrash />
              </IconButton>
            </HStack>

            {/* 4. CONTENT INFO */}
            <VStack
              position="absolute"
              bottom={0}
              left={0}
              w="full"
              p={5}
              align="start"
              gap={1}
              zIndex={2}
            >
              <Heading
                size="md"
                color="white"
                fontWeight="bold"
                lineHeight="shorter"
                truncate
                textShadow="0 2px 4px rgba(0,0,0,0.8)"
              >
                {course.title}
              </Heading>

              <Text
                fontSize="xs"
                color="gray.300"
                truncate
                lineHeight="tall"
                maxW="95%"
              >
                {course.description || "No description available."}
              </Text>

              <HStack
                mt={2}
                fontSize="xs"
                color="gray.400"
                fontWeight="medium"
                gap={3}
              >
                <HStack gap={1}>
                  <Icon as={FaBookOpen} />
                  <Text>{course.modules?.length || 0} Modules</Text>
                </HStack>
              </HStack>
            </VStack>
          </Box>
        </AspectRatio>
      </Box>
    </Link>
  );
};
