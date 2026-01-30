import { useParams, useNavigate } from "react-router";
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
} from "react-icons/fa";
import { LessonContentRenderer } from "~/features/lesson/components/LessonContentRenderer";
import { LessonPDFExporter } from "~/features/lesson/components/LessonPDFExporter";
import { useAuthStore } from "~/store/authStore"; // 👈 Import Auth Store
import { toaster } from "~/components/ui/toaster"; // 👈 Import Toaster
import { useConfigStore } from "~/store/configStore";

// Language Options
const LANGUAGES = [
  { value: "hinglish", label: "Hinglish (Mix)" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tamil" },
  { value: "ja", label: "Japanese" },
  { value: "es", label: "Spanish" },
];

// 👇 Define Costs

export default function LessonPage() {
  const getCost = useConfigStore((state) => state.getCost);

  // Dynamic Cost!
  const COST_LESSON_CONTENT = getCost("generateLesson");
  const COST_AUDIO_GEN = getCost("generateAudio");
  const COST_REGENERATE = getCost("regenerate");

  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch User & Credits
  const { user, setUser } = useAuthStore();
  const credits = user?.credits || 0;

  // 2. Fetch Data
  const { data: lesson, isLoading: isLessonLoading } = useLesson(lessonId);

  // 3. Action Hooks
  const { mutate: generate, isPending: isGenerating } =
    useGenerateLesson(courseId);

  const { mutate: generateAudio, isPending: isAudioGenerating } =
    useGenerateAudio();

  // 4. Video Search
  const { data: videoData } = useVideoSearch(lesson?.title || "", !!lesson);

  // 5. Local State
  const [selectedLang, setSelectedLang] = useState("hinglish");

  // 6. Compute Active Audio URL
  const currentAudioUrl = lesson?.audioUrls?.[selectedLang];

  // 7. Handle Lesson Generation (Content)
  const handleGenerateContent = () => {
    if (credits < COST_LESSON_CONTENT) {
      toaster.create({ title: "Insufficient credits", type: "error" });
      return;
    }

    generate(lessonId!, {
      onSuccess: () => {
        // Instant UI Update
        if (user)
          setUser({ ...user, credits: user.credits - COST_LESSON_CONTENT });
        toaster.create({ title: "Lesson content generated!", type: "success" });
      },
    });
  };

  // 8. Handle Audio Generation
  const handleGenerateAudio = () => {
    // Determine cost: Full price for new, discounted for regen
    const cost = currentAudioUrl ? COST_REGENERATE : COST_AUDIO_GEN;

    if (credits < cost) {
      toaster.create({ title: "Insufficient credits", type: "error" });
      return;
    }

    if (lessonId) {
      generateAudio(
        { lessonId, language: selectedLang },
        {
          onSuccess: () => {
            // Instant UI Update
            if (user) setUser({ ...user, credits: user.credits - cost });
            toaster.create({ title: "Audio generated!", type: "success" });
          },
        },
      );
    }
  };

  // --- Loading State ---
  if (isLessonLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  // --- Not Found State ---
  if (!lesson) {
    return (
      <Center h="100vh">
        <Text fontSize="lg" color="fg.muted">
          Lesson not found
        </Text>
      </Center>
    );
  }

  const hasContent =
    lesson.content &&
    Array.isArray(lesson.content) &&
    lesson.content.length > 0;

  return (
    <Container maxW="container.lg" py={8}>
      <Button variant="ghost" mb={4} onClick={() => navigate(-1)}>
        <FaArrowLeft /> Back to Course
      </Button>

      <VStack align="stretch" gap={6}>
        {/* --- Header --- */}
        <Box>
          <Heading size="3xl" mb={3}>
            {lesson.title}
          </Heading>
          <HStack>
            <Badge
              colorPalette={hasContent ? "green" : "yellow"}
              size="lg"
              variant="surface"
            >
              {hasContent ? "Ready to Learn" : "Draft Mode"}
            </Badge>
            {videoData && (
              <Badge colorPalette="blue" variant="outline">
                Video Available
              </Badge>
            )}
            {/* Show Current Balance Badge */}
            {/* <Badge colorPalette="purple" variant="solid" size="lg">
              Credits: {credits}
            </Badge> */}

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
            p={12}
            borderWidth="2px"
            borderStyle="dashed"
            borderColor="border"
            borderRadius="xl"
            flexDirection="column"
            gap={6}
            bg="bg.subtle"
          >
            <Heading size="md" color="fg.muted">
              This lesson is currently empty.
            </Heading>
            <Text maxW="md" textAlign="center" color="fg.muted">
              Click the button below to use AI to generate the full lesson
              content, find relevant videos, and prepare audio notes.
            </Text>

            <VStack gap={2}>
              <Button
                size="xl"
                colorPalette="purple"
                onClick={handleGenerateContent}
                loading={isGenerating}
                loadingText="AI is writing..."
                disabled={credits < COST_LESSON_CONTENT}
              >
                <FaMagic /> Generate Lesson Content (-{COST_LESSON_CONTENT})
              </Button>
              {credits < COST_LESSON_CONTENT && (
                <HStack color="red.500" fontSize="sm">
                  <FaExclamationTriangle />
                  <Text>Insufficient credits</Text>
                </HStack>
              )}
            </VStack>
          </Center>
        ) : (
          /* --- STATE 2: CONTENT VIEW --- */
          <VStack gap={8} align="stretch">
            {/* 1. Learning Objectives */}
            {lesson.objectives && lesson.objectives.length > 0 && (
              <Box
                bg="blue.50"
                _dark={{ bg: "blue.900/20" }}
                p={6}
                borderRadius="lg"
                borderLeftWidth="4px"
                borderLeftColor="blue.500"
              >
                <HStack mb={4} gap={3}>
                  <Icon color="blue.600" fontSize="lg">
                    <FaListUl />
                  </Icon>
                  <Heading
                    size="sm"
                    textTransform="uppercase"
                    color="blue.700"
                    _dark={{ color: "blue.300" }}
                    letterSpacing="wide"
                  >
                    In this lesson, you will learn:
                  </Heading>
                </HStack>

                <VStack align="start" gap={3}>
                  {lesson.objectives.map((obj: string, index: number) => (
                    <HStack key={index} gap={3} align="start">
                      <Icon color="green.500" mt={1}>
                        <FaCheckCircle />
                      </Icon>
                      <Text color="fg.emphasized">{obj}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}

            {/* 2. YouTube Embed */}
            {videoData && (
              <Box
                borderRadius="xl"
                overflow="hidden"
                boxShadow="lg"
                bg="black"
              >
                <iframe
                  width="100%"
                  height="480px"
                  src={`https://www.youtube.com/embed/${videoData.videoId}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </Box>
            )}

            {/* 3. Main Content */}
            <LessonContentRenderer content={lesson.content} />

            {/* 4. Audio Section */}
            <Box
              p={6}
              bg={{ base: "orange.50", _dark: "orange.900/20" }}
              borderRadius="lg"
              borderWidth="1px"
              borderColor={{ base: "orange.200", _dark: "orange.800" }}
            >
              <HStack justify="space-between" wrap="wrap" gap={4}>
                <VStack align="start" gap={1}>
                  <HStack>
                    <Icon color="orange.600">
                      <FaGlobe />
                    </Icon>
                    <Heading
                      size="sm"
                      color={{ base: "orange.800", _dark: "orange.300" }}
                    >
                      Audio Summary ({selectedLang})
                    </Heading>
                  </HStack>
                  <Text
                    fontSize="sm"
                    color={{ base: "orange.700", _dark: "orange.400" }}
                  >
                    {currentAudioUrl
                      ? "Audio ready! Click play to listen."
                      : `No audio for ${selectedLang} yet.`}
                  </Text>
                </VStack>

                <VStack align="end" gap={2} w={{ base: "full", md: "auto" }}>
                  <HStack>
                    <NativeSelect.Root size="sm" width="140px" variant="subtle">
                      <NativeSelect.Field
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        bg="white"
                        _dark={{ bg: "gray.800" }}
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>

                    {/* REGENERATE Button */}
                  </HStack>

                  {/* Player OR Generate Button */}
                  {currentAudioUrl ? (
                    <Box w={{ base: "full", md: "300px" }}>
                      <audio
                        key={currentAudioUrl}
                        controls
                        style={{ width: "100%" }}
                        src={currentAudioUrl}
                      >
                        Your browser does not support the audio element.
                      </audio>
                    </Box>
                  ) : (
                    <Button
                      variant="surface"
                      colorPalette="orange"
                      size="md"
                      onClick={handleGenerateAudio}
                      loading={isAudioGenerating}
                      loadingText="Generating..."
                      disabled={credits < COST_AUDIO_GEN}
                    >
                      <FaPlay /> Generate {selectedLang} Audio (-
                      {COST_AUDIO_GEN})
                    </Button>
                  )}

                  {/* Warning if broke */}
                  {!currentAudioUrl && credits < COST_AUDIO_GEN && (
                    <Text fontSize="xs" color="red.500">
                      Not enough credits
                    </Text>
                  )}
                </VStack>
              </HStack>
            </Box>
          </VStack>
        )}
      </VStack>
    </Container>
  );
}
