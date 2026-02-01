import {
  Box,
  Heading,
  Text,
  VStack,
  Badge,
  HStack,
  Container,
  Icon,
  IconButton,
  Flex,
  Image,
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

// ✅ Export loader for React Router
export async function loader() {
  return null;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId!),
    enabled: !!courseId,
  });

  const { mutate: deleteModule } = useDeleteModule(courseId!);
  const { mutate: deleteLesson } = useDeleteLesson(courseId!);

  if (isLoading) return <Text p={10}>Loading...</Text>;
  if (!course) return <Text p={10}>Course not found.</Text>;

  return (
    <Container maxW="container.xl" py={0} px={0}>
      {/* 1. HERO SECTION (Compact & Cinematic) */}
      <Box
        className="group"
        position="relative"
        overflow="hidden"
        // ✅ 1. Only round the bottom edges for a seamless "Header" look
        borderBottomRadius="3xl"
        // ✅ 2. Decreased Height: Content is visible immediately (380px-450px)
        h={{ base: "380px", md: "450px" }}
        display="flex"
        alignItems="flex-end"
        bg="gray.900"
        shadow="2xl"
        // borderWidth="1px"
        borderColor="whiteAlpha.100"
        transition="all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)"
        _hover={{
          transform: "translateY(-6px) ",
          shadow: "2xl",
          borderColor: "whiteAlpha.300",
          zIndex: 10,
        }}
      >
        {/* Background Image Layer */}
        {course.thumbnailUrl && (
          <Image
            src={course.thumbnailUrl}
            alt={course.title}
            objectFit="cover"
            position="absolute"
            inset="0"
            w="full"
            h="full"
            zIndex={0}
            // Subtle parallax-like scaling on hover
            transition="transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)"
            _groupHover={{
              transform: "scale(1.1)",
            }}
            filter="blur(2px) brightness(0.7)"
          />
        )}

        {/* ✅ DYNAMIC READABILITY LAYER 
           This strong gradient ensures White Text works on ANY image (White or Black).
        */}
        <Box
          position="absolute"
          inset="0"
          bgGradient="linear(to-t, #000000 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0) 100%)"
          zIndex={1}
          opacity={0.95}
        />

        {/* Content Container */}
        <Container
          maxW="container.lg"
          position="relative"
          zIndex={2}
          // ✅ 3. Adjusted padding for shorter height
          pb={{ base: 8, md: 10 }}
          px={{ base: 6, md: 12 }}
        >
          <VStack
            align="start"
            gap={4}
            transition="transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)"
            _groupHover={{ transform: "translateY(-8px)" }} // ✅ 4. 3D Lift Effect on Hover
          >
            {/* Badges */}
            <HStack gap={3}>
              {course.generationMode === "pro" && (
                <Badge
                  colorPalette="purple"
                  variant="solid"
                  rounded="full"
                  px={3}
                  py={1}
                  bg="purple.500"
                  boxShadow="0 4px 15px rgba(128, 90, 213, 0.6)"
                  fontWeight="bold"
                  letterSpacing="wide"
                >
                  PRO MODE
                </Badge>
              )}
              {course.tags.map((tag: string) => (
                <Badge
                  key={tag}
                  colorPalette="gray"
                  variant="surface"
                  rounded="full"
                  px={3}
                  bg="whiteAlpha.200"
                  color="white"
                  backdropFilter="blur(12px)"
                  borderWidth="1px"
                  borderColor="whiteAlpha.300"
                >
                  {tag}
                </Badge>
              ))}
            </HStack>

            {/* Typography */}
            <Box maxW="4xl">
              <Heading
                size="5xl"
                fontWeight="900"
                letterSpacing="tight"
                lineHeight="1.1"
                mb={3}
                color="white"
                // ✅ 5. Deep 3D Shadow for "Pop" & Legibility
                textShadow="0 10px 30px rgba(0,0,0,0.8)"
              >
                {course.title}
              </Heading>
              <Text
                fontSize="lg"
                color="gray.100"
                lineHeight="relaxed"
                fontWeight="medium"
                textShadow="0 2px 10px rgba(0,0,0,0.8)"
                maxW="3xl"
                truncate
              >
                {course.description}
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* 2. MODULES LIST */}
      <Flex
        gap={12}
        direction={{ base: "column", lg: "row" }}
        px={{ base: 4, md: 8 }} // Increased horizontal padding
        py={10}
      >
        <Box flex="1">
          <HStack mb={6} justify="space-between" align="baseline">
            <Heading size="lg">Syllabus</Heading>
            <Text color="fg.muted" fontWeight="medium">
              {course.modules.length} Modules
            </Text>
          </HStack>

          <VStack align="stretch" gap={5}>
            {course.modules.map((module: any, idx: number) => (
              <Box key={module._id}>
                <HStack mb={3} justify="space-between" className="group">
                  <Text
                    fontWeight="bold"
                    color="fg.subtle"
                    fontSize="xs"
                    letterSpacing="wider"
                    textTransform="uppercase"
                  >
                    Module {idx + 1} — {module.title}
                  </Text>
                  <IconButton
                    aria-label="Delete Module"
                    size="xs"
                    colorPalette="red"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete module?")) deleteModule(module._id);
                    }}
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                  >
                    <FaTrash />
                  </IconButton>
                </HStack>

                {/* Liquid Glass List */}
                <Box
                  overflow="hidden"
                  borderRadius="2xl"
                  bg="rgba(255, 255, 255, 0.4)"
                  _dark={{ bg: "rgba(20, 20, 20, 0.4)" }}
                  backdropFilter="blur(12px)"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  shadow="sm"
                >
                  <Box p={0}>
                    {module.lessons.map((lesson: any) => (
                      <Link
                        key={lesson._id}
                        to={`/course/${course._id}/lesson/${lesson._id}`}
                        style={{ display: "block" }}
                      >
                        <HStack
                          p={5}
                          borderBottomWidth="1px"
                          borderColor="whiteAlpha.100"
                          _last={{ borderBottomWidth: 0 }}
                          _hover={{ bg: "whiteAlpha.200" }}
                          transition="background 0.2s"
                          justify="space-between"
                          className="group/lesson"
                        >
                          <HStack gap={4}>
                            <Icon
                              color={
                                lesson.isEnriched
                                  ? "green.400"
                                  : "whiteAlpha.400"
                              }
                              fontSize="lg"
                            >
                              {lesson.isEnriched ? (
                                <FaCheckCircle />
                              ) : (
                                <FaPlayCircle />
                              )}
                            </Icon>
                            <Text fontWeight="medium" fontSize="md">
                              {lesson.title}
                            </Text>
                          </HStack>
                          <HStack>
                            <Icon color="fg.muted" opacity={0.5}>
                              <FaChevronRight />
                            </Icon>
                          </HStack>
                        </HStack>
                      </Link>
                    ))}
                    {module.lessons.length === 0 && (
                      <Text
                        p={6}
                        color="fg.muted"
                        fontSize="sm"
                        fontStyle="italic"
                      >
                        No lessons yet.
                      </Text>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </VStack>
        </Box>
      </Flex>
    </Container>
  );
}
