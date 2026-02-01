import { useParams, useNavigate, useSearchParams } from "react-router";
import { useState } from "react";
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
} from "@chakra-ui/react";
import { useLesson } from "~/features/lesson/hooks/useLesson"; // You might need to bypass this hook or update it to support the new logic, but below uses direct queries for history
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
} from "react-icons/fa";
import { LessonContentRenderer } from "~/features/lesson/components/LessonContentRenderer";
import { LessonPDFExporter } from "~/features/lesson/components/LessonPDFExporter";
import { useAuthStore } from "~/store/authStore";
import { toaster } from "~/components/ui/toaster";
import { useConfigStore } from "~/store/configStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "~/services/api";
import { Radio } from "~/components/ui/radio";

const LANGUAGES = [
  { value: "hinglish", label: "Hinglish (Mix)", locked: false },
  { value: "en", label: "English", locked: false },
  { value: "hi", label: "Hindi", locked: true },
  { value: "bn", label: "Bengali", locked: true },
  { value: "ta", label: "Tamil", locked: true },
  { value: "ja", label: "Japanese", locked: true },
  { value: "es", label: "Spanish", locked: true },
];

export default function LessonPage() {
  const getCost = useConfigStore((state) => state.getCost);
  const COST_LESSON_CONTENT = getCost("generateLesson");
  const COST_AUDIO_GEN = getCost("generateAudio");

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

  const historyLength = latestLesson?.history?.length || 0;
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
  const isLoading =
    isLatestLoading || (currentVersion < totalVersions && isHistoryLoading);

  // --- ACTIONS ---
  const { mutate: generate, isPending: isGenerating } =
    useGenerateLesson(courseId);
  const { mutate: generateAudio, isPending: isAudioGenerating } =
    useGenerateAudio();
  const { data: videoData } = useVideoSearch(lesson?.title || "", !!lesson);

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
        toaster.create({ title: "Lesson content generated!", type: "success" }),
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

  const handlePrevVersion = () => {
    if (currentVersion > 1) setSearchParams({ v: String(currentVersion - 1) });
  };
  const handleNextVersion = () => {
    if (currentVersion < totalVersions) {
      if (currentVersion + 1 === totalVersions) setSearchParams({});
      else setSearchParams({ v: String(currentVersion + 1) });
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

  return (
    <Container maxW="container.lg" py={8} pb={32}>
      <HStack justify="space-between" mb={4}>
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          _hover={{ bg: "whiteAlpha.200" }}
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
            <Badge
              colorPalette={hasContent ? "green" : "yellow"}
              size="lg"
              variant="surface"
              rounded="full"
              px={3}
            >
              {hasContent ? "Ready" : "Draft"}
            </Badge>
            {/* Version Badge */}
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

            {/* Mode Badge (If tracked in history) */}
            {(lesson as any).generationMode === "pro" && (
              <Badge
                colorPalette="purple"
                variant="solid"
                px={3}
                rounded="full"
              >
                PRO MODE
              </Badge>
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

      {/* ✅ INLINE ACTION BAR (Floating at Bottom) */}
      {hasContent && (
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setRegenOpen(true)}
              // Enable regen anytime, effectively branching/appending history
              _hover={{ bg: "whiteAlpha.200" }}
            >
              <Icon as={FaMagic} mr={2} color={"purple.400"} />
              Refine
            </Button>

            <Box w="1px" h="20px" bg="whiteAlpha.200" />

            <HStack gap={2}>
              <IconButton
                aria-label="Previous"
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
                aria-label="Next"
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
      )}

      {/* REGENERATION MODAL */}
      <Dialog.Root
        open={isRegenOpen}
        onOpenChange={(e) => setRegenOpen(e.open)}
      >
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(5px)" />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Refine Lesson</Dialog.Title>
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
                <Button variant="ghost">Cancel</Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette={regenMode === "pro" ? "purple" : "blue"}
                onClick={handleRefineSubmit}
                loading={refineMutation.isPending}
              >
                <Icon as={FaMagic} mr={1} />
                Refine
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Container>
  );
}
