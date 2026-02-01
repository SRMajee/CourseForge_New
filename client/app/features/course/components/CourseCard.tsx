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
  Dialog,
  Button,
} from "@chakra-ui/react";
import { FaTrash, FaBookOpen } from "react-icons/fa";
import { useDeleteCourse } from "../hooks/useCourseMutations";
import { Link } from "react-router";
import type { Course } from "~/types/course";
import { useState } from "react";

const handleDelete = (e: React.MouseEvent, id: string, deleteFn: any) => {
  e.preventDefault();
  e.stopPropagation();
  if (confirm("Delete this course?")) deleteFn(id);
};

export const CourseCard = ({ course }: { course: Course }) => {
  const { mutate: deleteCourse, isPending } = useDeleteCourse();
  const isPro = course.generationMode === "pro";
  // console.log("Course Data:", course);
  // ✅ Modal State
  const [isDeleteOpen, setDeleteOpen] = useState(false);

  // ✅ Open Modal Handler (Stops Navigation)
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteOpen(true);
  };
  return (
    <>
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
              {course.thumbnailUrl ? (
                <Image
                  src={course.thumbnailUrl}
                  alt={course.title}
                  objectFit="cover"
                  w="full"
                  h="full"
                  position="absolute"
                  inset="0"
                  // Removed inner shadow="2xl" here as it looks clipped. Parent has shadow.
                  filter="blur(0px)"
                  transition="all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)"
                  _groupHover={{
                    transform: "scale(1.1)",
                    filter: "blur(5px)", // Blur on hover
                  }}
                />
              ) : (
                // Fallback Gradient
                <Box
                  w="full"
                  h="full"
                  position="absolute"
                  inset="0"
                  bgGradient="linear(to-br, gray.800, gray.900)"
                  filter="blur(0px)"
                  transition="all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)"
                  _groupHover={{
                    transform: "scale(1.1)",
                    filter: "blur(5px)",
                  }}
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

                {/* ✅ DELETE BUTTON (Triggers Modal) */}
                <IconButton
                  aria-label="Delete"
                  size="xs"
                  colorPalette="red"
                  variant="solid"
                  bg="red.500/80"
                  onClick={handleDeleteClick} // 👈 Updated Handler
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
                  lineClamp={2}
                  textShadow="0 2px 4px rgba(0,0,0,0.8)"
                >
                  {course.title}
                </Heading>
                <Text
                  fontSize="xs"
                  color="gray.300"
                  lineClamp={2} // Wraps to 2 lines, then ellipsis
                  whiteSpace="normal"
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
      {/* ✅ LIQUID GLASS DELETE MODAL */}
      <Dialog.Root
        open={isDeleteOpen}
        onOpenChange={(e) => setDeleteOpen(e.open)}
        placement="center"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(10px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="rgba(20, 20, 20, 0.8)"
            _light={{ bg: "rgba(255, 255, 255, 0.8)" }}
            backdropFilter="blur(24px) saturate(180%)"
            borderRadius="3xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            boxShadow="0 20px 50px rgba(0,0,0,0.5)"
            p={8}
            textAlign="center"
            onClick={(e) => e.stopPropagation()} // Prevent click through
          >
            <VStack gap={6}>
              <Box
                p={4}
                bg="red.500/20"
                rounded="full"
                color="red.400"
                fontSize="2xl"
                boxShadow="0 0 20px rgba(245, 101, 101, 0.3)"
              >
                <Icon as={FaTrash} />
              </Box>
              <Box>
                <Heading size="xl" mb={2}>
                  Delete Course?
                </Heading>
                <Text color="fg.muted" maxW="xs" mx="auto">
                  Are you sure you want to delete{" "}
                  <Text as="span" color="fg.default" fontWeight="bold">
                    "{course.title}"
                  </Text>
                  ? This action cannot be undone.
                </Text>
              </Box>
              <HStack w="full" gap={3} pt={2}>
                <Button
                  variant="ghost"
                  flex={1}
                  onClick={() => setDeleteOpen(false)}
                  rounded="xl"
                  h="12"
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  flex={1}
                  onClick={() => deleteCourse(course._id)}
                  rounded="xl"
                  h="12"
                  shadow="lg"
                  loading={isPending}
                  _hover={{ transform: "translateY(-2px)", shadow: "xl" }}
                >
                  Confirm Delete
                </Button>
              </HStack>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
};
