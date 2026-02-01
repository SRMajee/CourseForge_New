import { useParams, useNavigate, useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Spinner,
  Center,
  Container,
  HStack,
  Badge,
  Icon,
  NativeSelect,
  Dialog,
  RadioGroup,
  Stack,
  Switch,
  Flex,
  IconButton,
  Menu,
  Portal,
  Spacer,
} from "@chakra-ui/react";
import { useLesson } from "~/features/lesson/hooks/useLesson";
import {
  useGenerateLesson,
  useVideoSearch,
  useGenerateAudio,
} from "~/features/lesson/hooks/useLessonActions";
import {
  FaMagic,
  FaPlay,
  FaArrowLeft,
  FaCheckCircle,
  FaListUl,
  FaGlobe,
  FaCoins,
  FaExclamationTriangle,
  FaLock,
  FaChevronLeft,
  FaChevronRight,
  FaHistory,
  FaGem,
  FaChevronDown,
  FaClock,
  FaTrash,
} from "react-icons/fa";
import { LessonContentRenderer } from "~/features/lesson/components/LessonContentRenderer";
import { LessonPDFExporter } from "~/features/lesson/components/LessonPDFExporter";
import { useAuthStore } from "~/store/authStore";
import { toaster } from "~/components/ui/toaster";
import { useConfigStore } from "~/store/configStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/services/api";
import { Radio } from "~/components/ui/radio";
import { useDeleteLesson } from "~/features/course/hooks/useCourseMutations";
import type { Route } from "./+types/dashboard";
import { getLessonById } from "~/services/lessonService";

const LANGUAGES = [
  { value: "hinglish", label: "Hinglish (Mix)", locked: false },
  { value: "en", label: "English", locked: false },
  { value: "hi", label: "Hindi", locked: true },
  { value: "bn", label: "Bengali", locked: true },
  { value: "ta", label: "Tamil", locked: true },
  { value: "ja", label: "Japanese", locked: true },
  { value: "es", label: "Spanish", locked: true },
];
// ✅ Update loader: Cast 'params' to ensure courseId is recognized
export async function loader({ params }: Route.LoaderArgs) {
  // Fixes: Property 'courseId' does not exist on type '{}'
  const { lessonId } = params as { lessonId: string };

  try {
    const lesson = await getLessonById(lessonId);
    return { lesson };
  } catch (error) {
    return { lesson: null };
  }
}

// ✅ Update meta: Cast 'data' to allow access to properties
export function meta({ data }: Route.MetaArgs) {
  // Fixes: Property 'course' does not exist on type 'never'
  const title = (data as any)?.lesson?.title || "Studio";
  return [{ title: `${title} | CourseForge` }];
}
export default function LessonPage() {
  const getCost = useConfigStore((state) => state.getCost);
  const COST_LESSON_CONTENT = getCost("generateLesson");
  const COST_AUDIO_GEN = getCost("generateAudio");
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const { courseId, lessonId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const credits = user?.credits || 0;
  const isPro = user?.planType === "PRO";

  // --- HISTORY LOGIC ---
  // 1. Fetch Latest
  const { data: latestLesson, isLoading: isLatestLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data } = await api.get(`/courses/lessons/${lessonId}`);
      return data;
    },
    enabled: !!lessonId,
  });

  const historyList = latestLesson?.history || [];
  const historyLength = historyList.length;
  const totalVersions = historyLength + 1;
  const viewVersionParam = searchParams.get("v");
  const currentVersion = viewVersionParam
    ? parseInt(viewVersionParam, 10)
    : totalVersions;

  // 2. Fetch History
  const { data: historicalLesson, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["lesson", lessonId, "history", currentVersion],
    queryFn: async () => {
      const historyIndex = currentVersion - 1;
      const { data } = await api.get(
        `/courses/lessons/${lessonId}/history/${historyIndex}`,
      );
      return data;
    },
    enabled: !!lessonId && currentVersion < totalVersions,
    staleTime: Infinity,
  });

  // 3. Resolve Data
  const lesson =
    currentVersion === totalVersions ? latestLesson : historicalLesson;
  useEffect(() => {
    if (lesson?.title) {
      document.title = `${lesson.title} | CourseForge`;
    }
  }, [lesson]);
  const isLoading =
    isLatestLoading || (currentVersion < totalVersions && isHistoryLoading);

  // --- ACTIONS ---
  const { mutate: generate, isPending: isGenerating } =
    useGenerateLesson(courseId);
  const { mutate: generateAudio, isPending: isAudioGenerating } =
    useGenerateAudio();
  const { data: videoData } = useVideoSearch(lesson?.title || "", !!lesson);
  const { mutate: deleteLesson, isPending: isDeleting } = useDeleteLesson(
    courseId!,
  );
  const [selectedLang, setSelectedLang] = useState("hinglish");
  const currentAudioUrl = lesson?.audioUrls?.[selectedLang];

  // Regeneration State
  const [isRegenOpen, setRegenOpen] = useState(false);
  const [regenOption, setRegenOption] = useState("simplify");
  const [regenMode, setRegenMode] = useState<"standard" | "pro">(
    isPro ? "pro" : "standard",
  );

  const refineMutation = useMutation({
    mutationFn: async (data: { instruction: string; mode: string }) => {
      return api.post(`/courses/lessons/${lessonId}/refine`, data);
    },
    onSuccess: () => {
      toaster.create({ title: "Lesson Refined!", type: "success" });
      setRegenOpen(false);
      queryClient.invalidateQueries({ queryKey: ["lesson", lessonId] });
      setSearchParams({}); // Snap to latest
    },
    onError: () =>
      toaster.create({ title: "Refinement Failed", type: "error" }),
  });

  const handleRefineSubmit = () => {
    let instruction = "Improve the content.";
    if (regenOption === "simplify")
      instruction =
        "Simplify the explanations and make it easier to understand.";
    if (regenOption === "expand")
      instruction = "Expand on key concepts and add more detail.";
    if (regenOption === "examples")
      instruction =
        "Add more practical code examples and real-world scenarios.";
    if (regenOption === "fix")
      instruction = "Fix any grammatical errors or logical inconsistencies.";

    refineMutation.mutate({ instruction, mode: regenMode });
  };

  const handleGenerateContent = () => {
    if (credits < COST_LESSON_CONTENT) {
      toaster.create({ title: "Insufficient credits", type: "error" });
      return;
    }
    generate(lessonId!, {
      onSuccess: () =>
        toaster.create({ title: "Lesson generated!", type: "success" }),
    });
  };

  const handleGenerateAudio = () => {
    const langConfig = LANGUAGES.find((l) => l.value === selectedLang);
    if (langConfig?.locked && !isPro) {
      toaster.create({
        title: "Pro Feature Locked",
        description: "Upgrade to Pro to generate audio in this language.",
        type: "error",
      });
      return;
    }
    if (credits < COST_AUDIO_GEN) {
      toaster.create({ title: "Insufficient credits", type: "error" });
      return;
    }
    if (lessonId) {
      generateAudio(
        { lessonId, language: selectedLang },
        {
          onSuccess: () =>
            toaster.create({ title: "Audio generated!", type: "success" }),
        },
      );
    }
  };

  const handleVersionChange = (version: number) => {
    if (version === totalVersions) {
      setSearchParams({});
    } else {
      setSearchParams({ v: String(version) });
    }
  };

  if (isLoading)
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  if (!lesson)
    return (
      <Center h="100vh">
        <Text fontSize="lg" color="fg.muted">
          Lesson not found
        </Text>
      </Center>
    );

  const hasContent =
    lesson.content &&
    Array.isArray(lesson.content) &&
    lesson.content.length > 0;

  // Prepare History Items
  const allVersions = [
    ...historyList.map((h: any, idx: number) => ({
      ...h,
      version: idx + 1,
      isLatest: false,
    })),
    {
      timestamp: latestLesson?.updatedAt || new Date(),
      generationMode: latestLesson?.generationMode || "standard",
      version: totalVersions,
      isLatest: true,
    },
  ];

  return (
    <Container maxW="container.lg" py={8} pb={32}>
      <HStack justify="space-between" mb={4}>
        <Button
          variant="ghost"
          onClick={() => navigate(`/course/${courseId}`)} // ✅ Explicitly navigate to course root          _hover={{ bg: "whiteAlpha.200" }}
        >
          <FaArrowLeft /> Back to Course
        </Button>
      </HStack>

      <VStack align="stretch" gap={8}>
        {/* --- Header --- */}
        <Box>
          <Heading
            size="3xl"
            mb={4}
            fontWeight="black"
            letterSpacing="tight"
            lineHeight="1.1"
          >
            {lesson.title}
          </Heading>
          <HStack wrap="wrap" gap={3}>
            {/* Mode Badge */}
            {/* ✅ Removed 'as any' cast since type is now updated */}
            {lesson.generationMode === "pro" && (
              <Badge
                colorPalette="purple"
                variant="solid"
                px={3}
                rounded="full"
              >
                PRO MODE
              </Badge>
            )}

            {/* ✅ NEW HISTORY DROPDOWN */}
            {hasContent && (
              <Menu.Root>
                <Menu.Trigger asChild>
                  <Button
                    variant="surface"
                    size="sm"
                    rounded="full"
                    px={4}
                    bg="whiteAlpha.50"
                    _hover={{ bg: "whiteAlpha.100" }}
                    borderWidth="1px"
                    borderColor="whiteAlpha.300"
                  >
                    <HStack gap={2}>
                      <Icon as={FaHistory} color="gray.400" />
                      <Text fontWeight="medium">
                        Version {currentVersion} / {totalVersions}
                      </Text>
                      <Icon as={FaChevronDown} size="xs" color="gray.500" />
                    </HStack>
                  </Button>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content
                      bg="gray.900"
                      borderColor="whiteAlpha.200"
                      shadow="2xl"
                      rounded="xl"
                      p={2}
                      maxH="300px"
                      overflowY="auto"
                      zIndex={200}
                    >
                      <Text
                        px={3}
                        py={2}
                        fontSize="xs"
                        fontWeight="bold"
                        color="gray.500"
                        textTransform="uppercase"
                      >
                        Version History
                      </Text>
                      {allVersions.map((v) => {
                        const isSelected = v.version === currentVersion;
                        const isProMode = v.generationMode === "pro";
                        return (
                          <Menu.Item
                            key={v.version}
                            value={String(v.version)}
                            onClick={() => handleVersionChange(v.version)}
                            bg={isSelected ? "whiteAlpha.100" : "transparent"}
                            _hover={{ bg: "whiteAlpha.200" }}
                            rounded="lg"
                            mb={1}
                          >
                            <HStack justify="space-between" w="full" py={1}>
                              <HStack gap={3}>
                                {/* Version Box */}
                                <Flex
                                  w="24px"
                                  h="24px"
                                  align="center"
                                  justify="center"
                                  bg={
                                    isSelected ? "blue.500" : "whiteAlpha.200"
                                  }
                                  rounded="md"
                                  fontSize="xs"
                                  fontWeight="bold"
                                  color="white"
                                >
                                  {v.version}
                                </Flex>
                                <VStack align="start" gap={0}>
                                  <HStack gap={2}>
                                    <Text
                                      fontSize="sm"
                                      fontWeight="semibold"
                                      color="white"
                                    >
                                      {v.isLatest
                                        ? "Current Version"
                                        : `Snapshot ${v.version}`}
                                    </Text>
                                    {isProMode && (
                                      <Icon
                                        as={FaGem}
                                        color="purple.400"
                                        size="xs"
                                      />
                                    )}
                                  </HStack>
                                  <HStack
                                    gap={2}
                                    fontSize="xs"
                                    color="gray.400"
                                  >
                                    <Icon as={FaClock} size="xs" />
                                    <Text>
                                      {new Date(
                                        v.timestamp,
                                      ).toLocaleDateString()}
                                    </Text>
                                  </HStack>
                                </VStack>
                              </HStack>

                              {isSelected && (
                                <Icon as={FaCheckCircle} color="blue.400" />
                              )}
                            </HStack>
                          </Menu.Item>
                        );
                      })}
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            )}

            {hasContent && (
              <LessonPDFExporter
                lesson={lesson}
                lessonTitle={courseId}
                videoThumbnail={videoData?.thumbnail}
                videoTitle={videoData?.title}
                videoUrl={
                  videoData?.videoId
                    ? `https://www.youtube.com/watch?v=${videoData.videoId}`
                    : undefined
                }
              />
            )}
            {/* ✅ SPACER PUSHES DELETE BUTTON TO RIGHT END */}
            <Spacer />

            <IconButton
              aria-label="Delete Lesson"
              size="sm"
              colorPalette="red"
              variant="ghost"
              loading={isDeleting}
              onClick={() => setDeleteOpen(true)} // 👈 Open Modal instead of confirm()
            >
              <FaTrash />
            </IconButton>
          </HStack>
        </Box>

        {/* --- STATE 1: NO CONTENT --- */}
        {!hasContent ? (
          <Center
            p={16}
            bg="rgba(255, 255, 255, 0.4)"
            _dark={{ bg: "rgba(20, 20, 20, 0.4)" }}
            backdropFilter="blur(20px)"
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            borderRadius="3xl"
            flexDirection="column"
            gap={6}
            shadow="xl"
          >
            <Heading size="md" color="fg.muted">
              This lesson is currently empty.
            </Heading>
            <Text maxW="md" textAlign="center" color="fg.muted">
              Click the button below to use AI to generate the full lesson
              content.
            </Text>

            <VStack gap={4}>
              <Button
                size="xl"
                colorPalette="purple"
                onClick={handleGenerateContent}
                loading={isGenerating}
                loadingText="AI is writing..."
                disabled={credits < COST_LESSON_CONTENT}
                rounded="full"
                shadow="lg"
                px={8}
              >
                <FaMagic /> Generate Content (-{COST_LESSON_CONTENT})
              </Button>
            </VStack>
          </Center>
        ) : (
          /* --- STATE 2: CONTENT VIEW --- */
          <VStack gap={10} align="stretch">
            {/* 1. Learning Objectives */}
            {lesson.objectives && lesson.objectives.length > 0 && (
              <Box
                bg="blue.500/5"
                backdropFilter="blur(12px)"
                p={8}
                borderRadius="2xl"
                borderWidth="1px"
                borderColor="blue.500/20"
                shadow="sm"
              >
                <HStack mb={6} gap={3}>
                  <Icon color="blue.400" fontSize="xl">
                    <FaListUl />
                  </Icon>
                  <Heading
                    size="sm"
                    textTransform="uppercase"
                    color="blue.500"
                    letterSpacing="wider"
                  >
                    Objectives
                  </Heading>
                </HStack>

                <VStack align="start" gap={4}>
                  {lesson.objectives.map((obj: string, index: number) => (
                    <HStack key={index} gap={3} align="start">
                      <Icon color="green.400" mt={1}>
                        <FaCheckCircle />
                      </Icon>
                      <Text fontSize="lg" color="fg.DEFAULT">
                        {obj}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

            {/* 2. YouTube Embed */}
            {videoData && (
              <Box
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="2xl"
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                bg="black"
              >
                <iframe
                  width="100%"
                  height="500px"
                  src={`https://www.youtube.com/embed/${videoData.videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </Box>
            )}

            {/* 3. Main Content */}
            <LessonContentRenderer
              content={lesson.content}
              lessonId={lessonId!}
            />

            {/* 4. Audio Section */}
            <Box
              p={8}
              bg="orange.500/5"
              backdropFilter="blur(12px)"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="orange.500/20"
              shadow="lg"
            >
              <HStack justify="space-between" wrap="wrap" gap={6}>
                <VStack align="start" gap={2}>
                  <HStack>
                    <Icon color="orange.400" fontSize="xl">
                      <FaGlobe />
                    </Icon>
                    <Heading size="md" color="orange.400">
                      Audio Summary
                    </Heading>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted">
                    {currentAudioUrl
                      ? "Audio ready!"
                      : `Generate an audio summary.`}
                  </Text>
                </VStack>

                <VStack align="end" gap={4} w={{ base: "full", md: "auto" }}>
                  <HStack>
                    <NativeSelect.Root size="sm" width="180px" variant="subtle">
                      <NativeSelect.Field
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        bg="whiteAlpha.100"
                        _dark={{ bg: "blackAlpha.300" }}
                        rounded="lg"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label} {lang.locked && !isPro ? "(Pro)" : ""}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                    {LANGUAGES.find((l) => l.value === selectedLang)?.locked &&
                      !isPro && (
                        <Box title="Locked">
                          <Icon color="gray.500" as={FaLock} />
                        </Box>
                      )}
                  </HStack>

                  {currentAudioUrl ? (
                    <Box w={{ base: "full", md: "350px" }}>
                      <audio
                        controls
                        style={{ width: "100%", borderRadius: "8px" }}
                        src={currentAudioUrl}
                      />
                    </Box>
                  ) : (
                    <Button
                      variant="surface"
                      colorPalette="orange"
                      size="md"
                      onClick={handleGenerateAudio}
                      loading={isAudioGenerating}
                      disabled={
                        credits < COST_AUDIO_GEN ||
                        (LANGUAGES.find((l) => l.value === selectedLang)
                          ?.locked &&
                          !isPro)
                      }
                      rounded="full"
                      px={6}
                    >
                      <FaPlay /> Generate
                    </Button>
                  )}
                </VStack>
              </HStack>
            </Box>
          </VStack>
        )}
      </VStack>

      {/* ✅ FIXED ACTION BUTTON (Refine) - Bottom Right */}
      {hasContent && currentVersion === totalVersions && (
        <Box position="fixed" bottom={8} right={8} zIndex={100}>
          <Button
            size="xl"
            bg="gray.900"
            _dark={{ bg: "gray.900" }}
            color="white"
            variant="solid"
            onClick={() => setRegenOpen(true)}
            rounded="full"
            shadow="2xl"
            width="60px"
            height="60px"
            overflow="hidden"
            transition="all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            display="flex"
            justifyContent="center"
            alignItems="center"
            padding={0}
            borderWidth="2px"
            borderColor={isPro ? "purple.500" : "blue.500"}
            _hover={{
              width: "150px", // Expand on hover
              paddingLeft: 6,
              paddingRight: 6,
              bg: "gray.900",
              borderColor: isPro ? "purple.400" : "blue.400",
            }}
            className="group"
          >
            <HStack gap={0}>
              <Icon
                as={FaMagic}
                fontSize="xl"
                color={isPro ? "purple.400" : "blue.400"}
              />
              <Box
                maxW="0px"
                overflow="hidden"
                whiteSpace="nowrap"
                transition="all 0.4s ease"
                opacity={0}
                _groupHover={{ maxW: "120px", opacity: 1, ml: 3 }}
              >
                <Text fontWeight="bold" fontSize="md">
                  Refine
                </Text>
              </Box>
            </HStack>
          </Button>
        </Box>
      )}

      {/* REGENERATION MODAL */}
      <Dialog.Root
        open={isRegenOpen}
        onOpenChange={(e) => setRegenOpen(e.open)}
        placement="center"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(10px)" />
        <Dialog.Positioner>
          <Dialog.Content
            // ✅ LIQUID GLASS STYLING
            bg="rgba(20, 20, 20, 0.8)"
            _light={{ bg: "rgba(255, 255, 255, 0.8)" }}
            backdropFilter="blur(30px) saturate(180%)"
            borderRadius="3xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            boxShadow="0 40px 80px -12px rgba(0, 0, 0, 0.5)"
            p={6}
          >
            <Dialog.Header>
              <Dialog.Title fontSize="xl" fontWeight="bold">
                Refine Lesson
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap={6}>
                <Text fontSize="sm" color="fg.muted">
                  How should AI improve this lesson?
                </Text>

                <RadioGroup.Root
                  value={regenOption}
                  onValueChange={(e) => setRegenOption(e.value || "simplify")}
                >
                  <Stack gap={3}>
                    <Radio value="simplify">Simplify & Clarify</Radio>
                    <Radio value="expand">Expand & Add Detail</Radio>
                    <Radio value="examples">Add Practical Examples</Radio>
                    <Radio value="fix">Fix Errors / Bugs</Radio>
                  </Stack>
                </RadioGroup.Root>

                {/* Pro Mode Toggle */}
                <Box
                  p={4}
                  bg={regenMode === "pro" ? "purple.500/10" : "whiteAlpha.50"}
                  _dark={{
                    bg: regenMode === "pro" ? "purple.500/10" : "whiteAlpha.50",
                  }}
                  rounded="2xl"
                  borderWidth="1px"
                  borderColor={
                    regenMode === "pro" ? "purple.500/30" : "whiteAlpha.100"
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
                          Better reasoning & code
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
                      Upgrade to unlock
                    </Text>
                  )}
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" rounded="xl">
                  Cancel
                </Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette={regenMode === "pro" ? "purple" : "blue"}
                onClick={handleRefineSubmit}
                loading={refineMutation.isPending}
                rounded="xl"
                shadow="lg"
                px={6}
                _hover={{ transform: "translateY(-2px)", shadow: "xl" }}
              >
                <Icon as={FaMagic} mr={1} />
                Refine
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
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
                  Delete Lesson?
                </Heading>
                <Text color="fg.muted" maxW="xs" mx="auto">
                  Are you sure you want to delete{" "}
                  <Text as="span" color="fg.default" fontWeight="bold">
                    "{lesson.title}"
                  </Text>
                  ? This action is permanent.
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
                  onClick={() => {
                    deleteLesson(lessonId!, {
                      onSuccess: () => navigate(`/course/${courseId}`),
                    });
                  }}
                  rounded="xl"
                  h="12"
                  shadow="lg"
                  loading={isDeleting}
                  _hover={{ transform: "translateY(-2px)", shadow: "xl" }}
                >
                  Confirm Delete
                </Button>
              </HStack>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Container>
  );
}
