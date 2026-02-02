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
  Menu,
  MenuItem,
  Portal,
  Center,
} from "@chakra-ui/react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router";
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
  FaClock,
  FaLayerGroup,
  FaChevronDown,
  FaCoins,
  FaSearch,
} from "react-icons/fa";
import {
  useDeleteCourse,
  useDeleteLesson,
  useDeleteModule,
} from "~/features/course/hooks/useCourseMutations";
import { useEffect, useState } from "react";
import { useAuthStore } from "~/store/authStore";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/services/api";
import { Radio } from "~/components/ui/radio";
import type { Route } from "./+types/dashboard";
import { useConfigStore } from "~/store/configStore";
import { CoursePDFButton } from "~/features/pdf/components/CoursePDFButton";
import { ModulePDFButton } from "~/features/pdf/components/ModulePDFButton";

// ✅ Update loader: Cast 'params' to ensure courseId is recognized
export async function loader({ params }: Route.LoaderArgs) {
  // Fixes: Property 'courseId' does not exist on type '{}'
  const { courseId } = params as { courseId: string };

  try {
    const course = await getCourseById(courseId);
    return { course };
  } catch (error) {
    return { course: null };
  }
}

// ✅ Update meta: Cast 'data' to allow access to properties
export function meta({ data }: Route.MetaArgs) {
  // Fixes: Property 'course' does not exist on type 'never'
  const title = (data as any)?.course?.title || "Studio";
  return [{ title: `${title} | CourseForge` }];
}
export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate(); // 👈 Add navigate for course deletion redirect
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isPro = user?.planType === "PRO";
  const { config } = useConfigStore(); // ✅ Get Config

  // 1. Fetch Latest Course
  const { data: latestCourse, isLoading: isLatestLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourseById(courseId!),
    enabled: !!courseId,
  });

  // Calculate History Metrics
  const historyList = latestCourse?.history || [];
  const totalVersions = historyList.length + 1; // History + Current

  // Derived Version State from URL
  const viewVersionParam = searchParams.get("v");
  const currentVersion = viewVersionParam
    ? parseInt(viewVersionParam, 10)
    : totalVersions;

  // 2. Fetch Historical Snapshot
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
  // ✅ Mutation Hooks
  const { mutate: deleteCourse } = useDeleteCourse();
  const { mutate: deleteModule } = useDeleteModule(courseId!);
  const { mutate: deleteLesson } = useDeleteLesson(courseId!);

  // ✅ Modal State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "course" | "module" | "lesson";
    id: string;
    title?: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "course") {
      deleteCourse(deleteTarget.id, {
        onSuccess: () => navigate("/dashboard"),
      });
    } else if (deleteTarget.type === "module") {
      deleteModule(deleteTarget.id);
    } else if (deleteTarget.type === "lesson") {
      deleteLesson(deleteTarget.id);
    }
    setDeleteTarget(null);
  };
  // ✅ 3. Determine which data to show
  const course =
    currentVersion === totalVersions ? latestCourse : historicalCourse;
  const isLoading =
    isLatestLoading || (currentVersion < totalVersions && isHistoryLoading);
  useEffect(() => {
    if (course?.title) {
      document.title = `${course.title} | CourseForge`;
    }
  }, [course]);

  const [isRegenOpen, setRegenOpen] = useState(false);
  const [regenOption, setRegenOption] = useState("improve");
  const [regenMode, setRegenMode] = useState<"standard" | "pro">(
    isPro ? "pro" : "standard",
  );
  // Calculate Cost (Dynamic based on mode)
  const regenCost =
    regenMode === "pro"
      ? config?.costs?.regenerateCoursePro || 75
      : config?.costs?.regenerateCourse || 25;
  const regenerateMutation = useMutation({
    mutationFn: async (data: { instruction: string; mode: string }) => {
      return api.post(`/courses/${courseId}/regenerate`, data);
    },
    onSuccess: () => {
      toaster.create({ title: "Course Regenerated!", type: "success" });
      setRegenOpen(false);
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      setSearchParams({}); // Snap to latest
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

  const handleVersionChange = (version: number) => {
    if (version === totalVersions) {
      setSearchParams({});
    } else {
      setSearchParams({ v: String(version) });
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

  if (!course)
    return (
      <Center h="100vh">
        <Box
          bg="rgba(20, 20, 20, 0.8)"
          _light={{ bg: "rgba(255, 255, 255, 0.8)" }}
          backdropFilter="blur(24px) saturate(180%)"
          borderRadius="3xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          boxShadow="0 20px 50px rgba(0,0,0,0.5)"
          p={8}
          textAlign="center"
          maxW="md"
          w="full"
        >
          <VStack gap={6}>
            <Box
              p={4}
              bg="orange.500/20"
              rounded="full"
              color="orange.400"
              fontSize="2xl"
              boxShadow="0 0 20px rgba(237, 137, 54, 0.3)"
            >
              <Icon as={FaSearch} />
            </Box>
            <Box>
              <Heading size="xl" mb={2}>
                Course Not Found
              </Heading>
              <Text color="fg.muted">
                The course you are looking for does not exist or has been
                removed.
              </Text>
            </Box>
          </VStack>
        </Box>
      </Center>
    );

  // Prepare History Items for Dropdown
  // Combine historical entries + current (latest)
  const allVersions = [
    ...historyList.map((h: any, idx: number) => ({
      ...h,
      version: idx + 1,
      isLatest: false,
    })),
    {
      timestamp: latestCourse?.updatedAt || new Date(),
      generationMode: latestCourse?.generationMode,
      modules: latestCourse?.modules, // Contains current modules
      version: totalVersions,
      isLatest: true,
    },
  ];

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

              {/* Active Version Badge (Only if viewing history) */}
              {currentVersion < totalVersions && (
                <Badge
                  colorPalette="orange"
                  variant="solid"
                  px={3}
                  rounded="full"
                  boxShadow="0 4px 15px rgba(237, 137, 54, 0.4)"
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
                lineClamp={2}
              >
                {course.description}
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>

      {/* 2. MODULES LIST & HEADER */}
      <Flex
        gap={12}
        direction={{ base: "column", lg: "row" }}
        px={{ base: 4, md: 8 }}
        py={10}
      >
        <Box flex="1">
          {/* HEADER LINE: Modules count + History Dropdown */}
          <HStack mb={6} justify="space-between" align="center">
            <HStack gap={4}>
              <Heading size="lg">Syllabus</Heading>
              <Text color="fg.muted" fontWeight="medium" fontSize="lg">
                &bull;
              </Text>
              <Text color="fg.muted" fontWeight="medium">
                {course.modules?.length || 0} Modules
              </Text>
              <Text color="fg.muted" fontWeight="medium">
                &bull;
              </Text>
              <Text color="fg.muted" fontWeight="medium">
                {course.modules?.reduce(
                  (acc: number, m: any) => acc + (m.lessons?.length || 0),
                  0,
                )}{" "}
                Lessons
              </Text>
              <Text color="fg.muted" fontWeight="medium">
                &bull;
              </Text>{" "}
              <Text color="fg.muted" fontWeight="medium">
                <CoursePDFButton course={course} />
              </Text>
            </HStack>
            <HStack gap={3}>
              {/* ✅ NEW HISTORY DROPDOWN */}
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
                                    <Text>&bull;</Text>
                                    <Icon as={FaLayerGroup} size="xs" />
                                    <Text>{v.modules?.length || 0} mods</Text>
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
              {/* ✅ DELETE COURSE BUTTON */}

              <IconButton
                aria-label="Delete Course"
                variant="ghost"
                colorPalette="red"
                size="sm"
                rounded="full"
                onClick={() =>
                  setDeleteTarget({
                    type: "course",
                    id: course._id,
                    title: course.title,
                  })
                }
                _hover={{ bg: "red.500/10", color: "red.400" }}
              >
                <FaTrash />
              </IconButton>
            </HStack>
          </HStack>
          {/* Module List */}
          <VStack align="stretch" gap={5}>
            {course.modules?.map((module: any, idx: number) => (
              <Box key={module._id}>
                <HStack mb={3} justify="space-between" className="group">
                  <HStack gap={3} >
                    <Text
                      fontWeight="bold"
                      color="fg.subtle"
                      fontSize="xs"
                      letterSpacing="wider"
                      textTransform="uppercase"
                    >
                      {module.title}
                    </Text>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ModulePDFButton
                        module={module}
                        courseTitle={course.title}
                      />
                    </div>
                  </HStack>
                  <IconButton
                    aria-label="Delete Module"
                    size="xs"
                    colorPalette="red"
                    variant="ghost"
                    onClick={() =>
                      setDeleteTarget({
                        type: "module",
                        id: module._id,
                        title: module.title,
                      })
                    }
                    opacity={0}
                    _groupHover={{ opacity: 1 }}
                  >
                    <FaTrash />
                  </IconButton>
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
                            {currentVersion === totalVersions && (
                              <IconButton
                                aria-label="Delete Lesson"
                                size="xs"
                                colorPalette="red"
                                variant="ghost"
                                opacity={0}
                                transition="opacity 0.2s"
                                _groupHover={{ opacity: 1 }}
                                onClick={(e) => {
                                  e.preventDefault(); // Stop navigation
                                  e.stopPropagation();
                                  setDeleteTarget({
                                    type: "lesson",
                                    id: lesson._id,
                                    title: lesson.title,
                                  });
                                }}
                              >
                                <FaTrash />
                              </IconButton>
                            )}

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
        </Box>
      </Flex>

      {/* ✅ 3. FIXED REGENERATE BUTTON (Floating Bottom Right) */}

      <Box position="fixed" bottom={8} right={8} zIndex={100}>
        <Button
          size="xl"
          bg="gray.900" // Always Black background
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
          borderColor={isPro ? "purple.500" : "blue.500"} // ✅ Permanent Border
          _hover={{
            width: "180px", // Expand
            paddingLeft: 6,
            paddingRight: 6,
            bg: "gray.900",
            borderColor: isPro ? "purple.400" : "blue.400", // Brighter on hover
          }}
          className="group"
        >
          <HStack gap={0}>
            <Icon
              as={FaMagic}
              fontSize="xl"
              color={isPro ? "purple.400" : "blue.400"} // ✅ Visible Icon
            />

            {/* Text Container - Width animates from 0 to auto */}
            <Box
              maxW="0px"
              overflow="hidden"
              whiteSpace="nowrap"
              transition="all 0.4s ease"
              opacity={0}
              _groupHover={{ maxW: "120px", opacity: 1, ml: 3 }} // Expand and add margin on hover
            >
              <Text fontWeight="bold" fontSize="md">
                Regenerate
              </Text>
            </Box>
          </HStack>
        </Button>
      </Box>

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
                Regenerate Course
              </Dialog.Title>
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

                {/* PRO MODE TOGGLE SWITCH (Glass Variant) */}
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
              <HStack mr="auto" gap={2} color="fg.muted">
                <Icon as={FaCoins} color="yellow.400" />
                <Text fontSize="sm" fontWeight="semibold">
                  {regenCost} Credits
                </Text>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <Button variant="ghost" rounded="xl">
                  Cancel
                </Button>
              </Dialog.CloseTrigger>
              <Button
                colorPalette={regenMode === "pro" ? "purple" : "blue"}
                onClick={handleRegenerate}
                loading={regenerateMutation.isPending}
                rounded="xl"
                shadow="lg"
                px={6}
                _hover={{ transform: "translateY(-2px)", shadow: "xl" }}
              >
                <Icon as={FaMagic} mr={1} />
                Regenerate
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
      {/* ✅ LIQUID GLASS DELETE MODAL */}
      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
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
                  Delete{" "}
                  {deleteTarget?.type === "course"
                    ? "Course"
                    : deleteTarget?.type === "module"
                      ? "Module"
                      : "Lesson"}
                  ?
                </Heading>
                <Text color="fg.muted" maxW="xs" mx="auto">
                  Are you sure you want to remove{" "}
                  <Text as="span" color="fg.default" fontWeight="bold">
                    "{deleteTarget?.title}"
                  </Text>
                  ? This action cannot be undone.
                </Text>
              </Box>
              <HStack w="full" gap={3} pt={2}>
                <Button
                  variant="ghost"
                  flex={1}
                  onClick={() => setDeleteTarget(null)}
                  rounded="xl"
                  h="12"
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  flex={1}
                  onClick={handleDeleteConfirm}
                  rounded="xl"
                  h="12"
                  shadow="lg"
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
