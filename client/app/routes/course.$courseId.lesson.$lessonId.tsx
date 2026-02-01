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
  FaExclamationTriangle,
} from "react-icons/fa";
import { LessonContentRenderer } from "~/features/lesson/components/LessonContentRenderer";
import { LessonPDFExporter } from "~/features/lesson/components/LessonPDFExporter";
import { useAuthStore } from "~/store/authStore";
import { toaster } from "~/components/ui/toaster";
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

export default function LessonPage() {
  const getCost = useConfigStore((state) => state.getCost);
  const COST_LESSON_CONTENT = getCost("generateLesson");
  const COST_AUDIO_GEN = getCost("generateAudio");

  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const credits = user?.credits || 0;

  const { data: lesson, isLoading: isLessonLoading } = useLesson(lessonId);
  const { mutate: generate, isPending: isGenerating } =
    useGenerateLesson(courseId);
  const { mutate: generateAudio, isPending: isAudioGenerating } =
    useGenerateAudio();
  const { data: videoData } = useVideoSearch(lesson?.title || "", !!lesson);

  const [selectedLang, setSelectedLang] = useState("hinglish");
  const currentAudioUrl = lesson?.audioUrls?.[selectedLang];

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
    const cost = COST_AUDIO_GEN;
    if (credits < cost) {
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

  if (isLessonLoading)
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
    <Container maxW="container.lg" py={8}>
      <Button
        variant="ghost"
        mb={4}
        onClick={() => navigate(-1)}
        _hover={{ bg: "whiteAlpha.200" }}
      >
        <FaArrowLeft /> Back to Course
      </Button>

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
            {videoData && (
              <Badge
                colorPalette="blue"
                variant="outline"
                rounded="full"
                px={3}
              >
                Video Available
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
            // ✅ LIQUID GLASS EMPTY STATE
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
              content, find relevant videos, and prepare audio notes.
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
                _hover={{ transform: "scale(1.05)" }}
              >
                <FaMagic /> Generate Content (-{COST_LESSON_CONTENT})
              </Button>
              {credits < COST_LESSON_CONTENT && (
                <HStack color="red.400" fontSize="sm">
                  <FaExclamationTriangle />
                  <Text>Insufficient credits</Text>
                </HStack>
              )}
            </VStack>
          </Center>
        ) : (
          /* --- STATE 2: CONTENT VIEW --- */
          <VStack gap={10} align="stretch">
            {/* 1. Learning Objectives (Blue Glass) */}
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
                    In this lesson, you will learn:
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

            {/* 2. YouTube Embed (Glass Container) */}
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

            {/* 4. Audio Section (Orange Glass) */}
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
                      Audio Summary ({selectedLang})
                    </Heading>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted">
                    {currentAudioUrl
                      ? "Audio ready! Click play to listen."
                      : `No audio for ${selectedLang} yet.`}
                  </Text>
                </VStack>

                <VStack align="end" gap={4} w={{ base: "full", md: "auto" }}>
                  <HStack>
                    <NativeSelect.Root size="sm" width="160px" variant="subtle">
                      <NativeSelect.Field
                        value={selectedLang}
                        onChange={(e) => setSelectedLang(e.target.value)}
                        bg="whiteAlpha.100"
                        _dark={{ bg: "blackAlpha.300" }}
                        rounded="lg"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.value} value={lang.value}>
                            {lang.label}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </HStack>

                  {/* Player OR Generate Button */}
                  {currentAudioUrl ? (
                    <Box w={{ base: "full", md: "350px" }}>
                      <audio
                        key={currentAudioUrl}
                        controls
                        style={{ width: "100%", borderRadius: "8px" }}
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
                      rounded="full"
                      px={6}
                    >
                      <FaPlay /> Generate Audio (-{COST_AUDIO_GEN})
                    </Button>
                  )}

                  {!currentAudioUrl && credits < COST_AUDIO_GEN && (
                    <Text fontSize="xs" color="red.400">
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
