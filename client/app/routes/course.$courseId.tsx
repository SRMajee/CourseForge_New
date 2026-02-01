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
  Button,
  Dialog,
  RadioGroup,
  Stack,
  Switch,
  Spacer,
  Spinner,
} from "@chakra-ui/react";
import { useParams, Link, useSearchParams } from "react-router"; // ✅ Import useSearchParams
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCourseById } from "~/services/courseService";
import {
  FaCheckCircle,
  FaPlayCircle,
  FaChevronRight,
  FaTrash,
  FaRedo,
  FaMagic,
  FaGem,
  FaChevronLeft,
  FaHistory,
} from "react-icons/fa";
import {
  useDeleteLesson,
  useDeleteModule,
} from "~/features/course/hooks/useCourseMutations";
import { useState } from "react";
import { useAuthStore } from "~/store/authStore";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/services/api";
import { Radio } from "~/components/ui/radio";

// ✅ Export loader for React Router
export async function loader() {
  return null;
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams(); // ✅ URL State
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isPro = user?.planType === "PRO";

  // 1. Fetch Latest Course (Always needed for history count)
  const { data: latestCourse, isLoading: isLatestLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId!),
    enabled: !!courseId,
  });

  // Calculate History Metrics
  const historyLength = latestCourse?.history?.length || 0;
  const totalVersions = historyLength + 1; // History + Current

  // Derived Version State from URL
  const viewVersionParam = searchParams.get("v");
  const currentVersion = viewVersionParam
    ? parseInt(viewVersionParam, 10)
    : totalVersions;

  // 2. Fetch Historical Snapshot (Only if not viewing latest)
  const { data: historicalCourse, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["course", courseId, "history", currentVersion],
    queryFn: async () => {
      const historyIndex = currentVersion - 1;
      const { data } = await api.get(
        `/courses/${courseId}/history/${historyIndex}`,
      );
      return data;
    },
    enabled: !!courseId && currentVersion < totalVersions,
    staleTime: Infinity,
  });

  // ✅ 3. Determine which data to show
  const course =
    currentVersion === totalVersions ? latestCourse : historicalCourse;
  const isLoading =
    isLatestLoading || (currentVersion < totalVersions && isHistoryLoading);

  const { mutate: deleteModule } = useDeleteModule(courseId!);
  const [isRegenOpen, setRegenOpen] = useState(false);
  const [regenOption, setRegenOption] = useState("improve");
  const [regenMode, setRegenMode] = useState<"standard" | "pro">(
    isPro ? "pro" : "standard",
  );

  const regenerateMutation = useMutation({
    mutationFn: async (data: { instruction: string; mode: string }) => {
      return api.post(`/courses/${courseId}/regenerate`, data);
    },
    onSuccess: () => {
      toaster.create({ title: "Course Regenerated!", type: "success" });
      setRegenOpen(false);
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      // ✅ Snap to new latest version (clear param)
      setSearchParams({});
    },
    onError: () =>
      toaster.create({ title: "Regeneration Failed", type: "error" }),
  });

  const handleRegenerate = () => {
    let instruction = "Improve the course structure.";
    if (regenOption === "harder")
      instruction = "Make the curriculum more advanced and challenging.";
    if (regenOption === "practical")
      instruction = "Focus heavily on practical, real-world examples.";
    if (regenOption === "bugs")
      instruction = "Fix logical gaps and ensure prerequisites are correct.";

    regenerateMutation.mutate({ instruction, mode: regenMode });
  };

  const handlePrevVersion = () => {
    if (currentVersion > 1) {
      setSearchParams({ v: String(currentVersion - 1) });
    }
  };

  const handleNextVersion = () => {
    if (currentVersion < totalVersions) {
      if (currentVersion + 1 === totalVersions) {
        setSearchParams({}); // Clear param to show latest
      } else {
        setSearchParams({ v: String(currentVersion + 1) });
      }
    }
  };

  if (isLoading)
    return (
      <Flex
        h="100vh"
        justify="center"
        align="center"
        direction="column"
        gap={4}
      >
        <Spinner size="xl" color="purple.500" />
        <Text color="fg.muted" fontSize="sm">
          Loading{" "}
          {currentVersion === totalVersions
            ? "Course"
            : `Version ${currentVersion}`}
          ...
        </Text>
      </Flex>
    );

  if (!course) return <Text p={10}>Course not found.</Text>;

  return (
    <Container maxW="container.xl" py={0} px={0} position="relative" pb={24}>
      {/* 1. HERO SECTION */}
      <Box
        className="group"
        position="relative"
        overflow="hidden"
        borderBottomRadius="3xl"
        h={{ base: "380px", md: "450px" }}
        display="flex"
        alignItems="flex-end"
        bg="gray.900"
        shadow="2xl"
      >
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
            transition="transform 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)"
            _groupHover={{ transform: "scale(1.05)" }}
          />
        )}

        <Box
          position="absolute"
          inset="0"
          bgGradient="linear(to-t, #000000 0%, rgba(0,0,0,0.8) 30%, rgba(0,0,0,0) 100%)"
          zIndex={1}
          opacity={0.95}
        />

        <Container
          maxW="container.lg"
          position="relative"
          zIndex={2}
          pb={{ base: 8, md: 10 }}
          px={{ base: 6, md: 12 }}
        >
          <VStack
            align="start"
            gap={4}
            transition="transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)"
            _groupHover={{ transform: "translateY(-8px)" }}
          >
            <HStack gap={3} w="full">
              {course.generationMode === "pro" && (
                <Badge
                  colorPalette="purple"
                  variant="solid"
                  rounded="full"
                  px={3}
                  bg="purple.500"
                  boxShadow="0 4px 15px rgba(128, 90, 213, 0.6)"
                >
                  PRO MODE
                </Badge>
              )}
              {course.tags?.map((tag: string) => (
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
              {/* Historical Badge */}
              {currentVersion < totalVersions && (
                <Badge
                  colorPalette="orange"
                  variant="solid"
                  px={3}
                  rounded="full"
                >
                  <Icon as={FaHistory} mr={1} />
                  Viewing Version {currentVersion}
                </Badge>
              )}
            </HStack>

            <Box maxW="4xl">
              <Heading
                size="5xl"
                fontWeight="900"
                letterSpacing="tight"
                lineHeight="1.1"
                mb={3}
                color="white"
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
        px={{ base: 4, md: 8 }}
        py={10}
      >
        <Box flex="1">
          <HStack mb={6} justify="space-between" align="baseline">
            <Heading size="lg">Syllabus</Heading>
            <Text color="fg.muted" fontWeight="medium">
              {course.modules?.length || 0} Modules
            </Text>
          </HStack>

          <VStack align="stretch" gap={5}>
            {course.modules?.map((module: any, idx: number) => (
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
                  {currentVersion === totalVersions && (
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
                  )}
                </HStack>

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
                    {module.lessons?.map((lesson: any) => (
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
                    {module.lessons?.length === 0 && (
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

          {/* ✅ 3. FIXED ACTION BAR (Floating at Bottom) */}
          <Flex
            justify="center"
            position="fixed"
            bottom={6}
            left="0"
            right="0"
            zIndex={100}
            pointerEvents="none"
          >
            <HStack
              bg="gray.900"
              borderRadius="full"
              borderWidth="1px"
              borderColor="whiteAlpha.200"
              shadow="2xl"
              p={2}
              pl={4}
              pr={2}
              gap={4}
              pointerEvents="auto"
            >
              {/* Regenerate Button (Always Active) */}
              <Button
                size="sm"
                variant="ghost"
                color="white"
                onClick={() => setRegenOpen(true)}
                _hover={{ bg: "whiteAlpha.200" }}
              >
                <Icon as={FaMagic} mr={2} color="purple.400" />
                Regenerate
              </Button>

              {/* Divider */}
              <Box w="1px" h="20px" bg="whiteAlpha.200" />

              {/* History Navigation */}
              <HStack gap={2}>
                <IconButton
                  aria-label="Previous Version"
                  size="xs"
                  variant="ghost"
                  rounded="full"
                  color="gray.400"
                  disabled={currentVersion <= 1}
                  onClick={handlePrevVersion}
                  _hover={{ color: "white", bg: "whiteAlpha.200" }}
                >
                  <FaChevronLeft />
                </IconButton>

                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="whiteAlpha.900"
                  fontFamily="mono"
                  minW="40px"
                  textAlign="center"
                >
                  {currentVersion} / {totalVersions}
                </Text>

                <IconButton
                  aria-label="Next Version"
                  size="xs"
                  variant="ghost"
                  rounded="full"
                  color="gray.400"
                  disabled={currentVersion >= totalVersions}
                  onClick={handleNextVersion}
                  _hover={{ color: "white", bg: "whiteAlpha.200" }}
                >
                  <FaChevronRight />
                </IconButton>
              </HStack>
            </HStack>
          </Flex>
        </Box>
      </Flex>

      {/* REGENERATION MODAL */}
      <Dialog.Root
        open={isRegenOpen}
        onOpenChange={(e) => setRegenOpen(e.open)}
      >
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(5px)" />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Regenerate Course</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={6}>
                <Text fontSize="sm" color="fg.muted">
                  How should the AI improve this syllabus?
                </Text>

                <RadioGroup.Root
                  value={regenOption}
                  onValueChange={(e) => setRegenOption(e.value || "improve")}
                >
                  <Stack gap={3}>
                    <Radio value="harder">Make it harder & more advanced</Radio>
                    <Radio value="practical">Focus on practical examples</Radio>
                    <Radio value="bugs">Fix logical gaps / bugs</Radio>
                  </Stack>
                </RadioGroup.Root>

                {/* PRO MODE TOGGLE SWITCH */}
                <Box
                  p={4}
                  bg={regenMode === "pro" ? "purple.500/10" : "gray.50"}
                  _dark={{
                    bg: regenMode === "pro" ? "purple.500/10" : "whiteAlpha.50",
                  }}
                  rounded="lg"
                  borderWidth="1px"
                  borderColor={
                    regenMode === "pro" ? "purple.500/30" : "transparent"
                  }
                >
                  <HStack justify="space-between">
                    <HStack>
                      <Icon as={FaGem} color="purple.400" />
                      <VStack align="start" gap={0}>
                        <Text fontWeight="bold" fontSize="sm">
                          Pro Model (GPT-4o)
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          Deeper reasoning & logic
                        </Text>
                      </VStack>
                    </HStack>

                    <Switch.Root
                      checked={regenMode === "pro"}
                      onCheckedChange={(e) =>
                        isPro && setRegenMode(e.checked ? "pro" : "standard")
                      }
                      colorPalette="purple"
                      disabled={!isPro}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  </HStack>
                  {!isPro && (
                    <Text fontSize="xs" color="orange.400" mt={2}>
                      Upgrade to Pro to unlock
                    </Text>
                  )}
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost">Cancel</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette={regenMode === "pro" ? "purple" : "blue"}
                onClick={handleRegenerate}
                loading={regenerateMutation.isPending}
              >
                <Icon as={FaMagic} mr={1} />
                Regenerate
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Container>
  );
}
