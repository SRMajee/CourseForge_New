import {
  Heading,
  Text,
  VStack,
  Container,
  SimpleGrid,
  Box,
  Icon,
  Flex,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import type { Route } from "./+types/dashboard";
import { useAuthStore } from "~/store/authStore";
import { useCreateCourse } from "~/features/course/hooks/useCreateCourse";
import { api } from "~/services/api";
import { toaster } from "~/components/ui/toaster";
import { useNavigate } from "react-router";

import { HeroInput } from "~/features/dashboard/components/HeroInput";
import { ClarificationForm } from "~/features/course/components/ClarificationForm";
import { CourseTerminal } from "~/features/course/components/CourseTerminal";
import {
  FaBolt,
  FaSearch,
  FaLayerGroup,
  FaGem,
  FaGlobe,
  FaBrain,
} from "react-icons/fa";
import { useSocketStore } from "~/store/socketStore";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Studio | CourseForge" }];
}

export default function Dashboard() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { mutate, isPending } = useCreateCourse();
  const { connect, disconnect, socket } = useSocketStore();
  const [viewState, setViewState] = useState<
    "idle" | "clarifying" | "generating"
  >("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [clarificationData, setClarificationData] = useState<any>(null);

  // ✅ Lifted Mode State
  const [mode, setMode] = useState<"standard" | "pro">("standard");
  const userId = user?._id;
  useEffect(() => {
    if (!socket) return;

    const handleUserUpdate = (updates: any) => {
      // If the backend sends { hasUsedProTrial: true }, we merge it into the user state
      if (user && setUser) {
        // console.log("🔄 Syncing User State:", updates);
        setUser({ ...user, ...updates });
      }
    };

    socket.on("user_updated", handleUserUpdate);

    return () => {
      socket.off("user_updated", handleUserUpdate);
    };
  }, [socket, user, setUser]);
  useEffect(() => {
    if (userId) {
      // Console log to prove it only runs once now
      // console.log("🔌 Dashboard: Connecting Socket for", userId);
      connect(userId);
    }
  }, [userId, connect]); // 👈 Changed [user] to [userId]
  // Auto-set mode based on user preference or plan
  useEffect(() => {
    if (user?.planType === "PRO" || user?.subscriptionStatus === "active") {
      setMode("pro");
    }
  }, [user]);

  const handleGenerate = (topic: string) => {
    mutate(
      { topic, mode },
      {
        onSuccess: (data: any) => {
          if (data?.code === "CLARIFICATION_NEEDED") {
            setClarificationData(data.data);
            setViewState("clarifying");
            return;
          }
          if (data.jobId) {
            setJobId(data.jobId);
            setViewState("generating");
          }
        },
        // onError: () =>
        //   toaster.create({ title: "Failed to start", type: "error" }),
      },
    );
  };

  const handleResume = async (answers: Record<string, string>) => {
    if (!clarificationData) return;
    try {
      const { data } = await api.post("/courses/resume", {
        jobId: clarificationData.jobId,
        answers,
      });

      if (data.jobId) {
        setJobId(data.jobId);
        setClarificationData(null);
        setViewState("generating");
      }
    } catch (error) {
      toaster.create({ title: "Failed to resume", type: "error" });
    }
  };

  if (viewState === "generating" && jobId) {
    return (
      <Flex
        align="center"
        justify="center"
        minH="60vh"
        position="relative"
        w="full"
        px={4}
      >
        {/* --- Ambient Liquid Glow --- */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          w="600px"
          h="600px"
          bgGradient="radial(circle, blue.500, transparent 60%)"
          _dark={{ bgGradient: "radial(circle, blue.600, transparent 60%)" }}
          filter="blur(150px)"
          opacity={0.15}
          zIndex={0}
          pointerEvents="none"
        />

        {/* --- Glass Card Container --- */}
        <VStack
          position="relative"
          zIndex={1}
          w="full"
          maxW="container.md"
          p={{ base: 6, md: 12 }}
          bg="whiteAlpha.50"
          // High blur + saturation = Premium Liquid Glass
          backdropFilter="blur(30px) saturate(160%)"
          borderRadius="3xl"
          border="1px solid"
          borderColor="whiteAlpha.300"
          _dark={{ bg: "blackAlpha.200", borderColor: "whiteAlpha.100" }}
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.15)"
          gap={8}
        >
          <Heading
            size="xl"
            fontWeight="bold"
            bgGradient="linear(to-r, blue.400, purple.500)"
            bgClip="text"
            letterSpacing="tight"
            textAlign="center"
            filter="drop-shadow(0 0 20px rgba(66, 153, 225, 0.3))"
          >
            Constructing Intelligence...
          </Heading>

          <Box
            w="full"
            rounded="xl"
            overflow="hidden"
            // Subtle inset to make the terminal look embedded in the glass
            bg="blackAlpha.300"
            border="1px solid"
            borderColor="whiteAlpha.100"
            shadow="inner"
          >
            <CourseTerminal jobId={jobId} />
          </Box>
        </VStack>
      </Flex>
    );
  }

  if (viewState === "clarifying" && clarificationData) {
    return (
      <Container maxW="container.md" centerContent py={10}>
        <ClarificationForm
          reason={clarificationData.reason || "Personalization"}
          questions={clarificationData.questions}
          onSubmit={handleResume}
          isLoading={false}
        />
      </Container>
    );
  }

  return (
    <Box position="relative" minH="100%" overflow="hidden">
      {/* Background Blobs */}
      <Box
        position="absolute"
        top="-20%"
        left="-10%"
        w="500px"
        h="500px"
        bg={mode === "pro" ? "purple.500" : "blue.500"}
        opacity={0.04}
        filter="blur(100px)"
        zIndex={-1}
        borderRadius="full"
        transition="background 0.5s ease"
      />
      <Box
        position="absolute"
        bottom="-20%"
        right="-10%"
        w="600px"
        h="600px"
        bg={mode === "pro" ? "blue.500" : "cyan.500"}
        opacity={0.04}
        filter="blur(120px)"
        zIndex={-1}
        borderRadius="full"
        transition="background 0.5s ease"
      />

      <Container maxW="container.lg" py={{ base: 6, md: 10 }}>
        <VStack gap={4} textAlign="center" mb={10}>
          <Heading
            size="4xl"
            letterSpacing="tight"
            fontWeight="extrabold"
            lineHeight="1.1"
          >
            What do you want to <br />
            <Text
              as="span"
              bgClip="text"
              bgGradient={mode === "pro" ? "to-r" : "to-r"}
              gradientFrom={mode === "pro" ? "purple.400" : "blue.400"}
              gradientTo={mode === "pro" ? "pink.400" : "cyan.400"}
            >
              master today?
            </Text>
          </Heading>
          <Text fontSize="lg" color="fg.muted" maxW="2xl" lineHeight="relaxed">
            AI-driven curriculum design. Enter a topic, and we'll engineer a
            structured learning path tailored to your goals.
          </Text>
        </VStack>

        <HeroInput
          onSubmit={handleGenerate}
          isLoading={isPending}
          mode={mode}
          onModeChange={setMode}
        />

        {/* ✅ DYNAMIC FEATURE GRID */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={5} mt={12} px={2}>
          {mode === "pro" ? (
            // PRO MODE CARDS
            <>
              <FeatureCard
                icon={FaGlobe}
                color="purple.400"
                title="Deep Research"
                desc="Scans live web sources to build the most up-to-date curriculum available."
              />
              <FeatureCard
                icon={FaBrain}
                color="pink.400"
                title="Reasoning Engine"
                desc="Uses advanced models (DeepSeek/GPT-4) to solve complex logic and coding tasks."
              />
              <FeatureCard
                icon={FaGem}
                color="orange.400"
                title="Expert Verification"
                desc="Includes interactive clarification steps to tailor the course specifically to you."
              />
            </>
          ) : (
            // STANDARD MODE CARDS
            <>
              <FeatureCard
                icon={FaBolt}
                color="blue.400"
                title="Instant Structure"
                desc="Generates modules, lessons, and learning objectives in seconds."
              />
              <FeatureCard
                icon={FaSearch}
                color="cyan.400"
                title="Smart Search"
                desc="Finds relevant YouTube videos and reading materials automatically."
              />
              <FeatureCard
                icon={FaLayerGroup}
                color="green.400"
                title="Interactive Labs"
                desc="Every course includes quizzes, code challenges, and flashcards."
              />
            </>
          )}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

const FeatureCard = ({
  icon,
  color,
  title,
  desc,
}: {
  icon: any;
  color: string;
  title: string;
  desc: string;
}) => (
  <VStack
    bg="whiteAlpha.200"
    _dark={{ bg: "whiteAlpha.50" }}
    backdropFilter="blur(16px)"
    p={5}
    borderRadius="2xl"
    borderWidth="1px"
    borderColor="whiteAlpha.200"
    align="start"
    transition="all 0.3s"
    _hover={{
      transform: "translateY(-3px)",
      bg: "whiteAlpha.300",
      shadow: "lg",
      borderColor: "whiteAlpha.300",
    }}
  >
    <Icon as={icon} fontSize="xl" color={color} mb={2} />
    <Heading size="sm" fontWeight="bold">
      {title}
    </Heading>
    <Text fontSize="xs" color="fg.muted" lineHeight="tall">
      {desc}
    </Text>
  </VStack>
);
