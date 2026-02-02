import {
  Dialog,
  Button,
  Input,
  VStack,
  Text,
  Field,
  HStack,
  Box,
  Portal,
  Switch,
  Icon,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useCreateCourse } from "../hooks/useCreateCourse";
import { FaMagic, FaCoins, FaExclamationCircle, FaGem } from "react-icons/fa";
import { useAuthStore } from "~/store/authStore";
import { CourseTerminal } from "./CourseTerminal";
import { ClarificationForm } from "./ClarificationForm";
import { api } from "~/services/api";
import { toaster } from "~/components/ui/toaster";
import { useConfigStore } from "~/store/configStore";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCourseModal = ({
  isOpen,
  onClose,
}: CreateCourseModalProps) => {
  const getCost = useConfigStore((state) => state.getCost);
  const [topic, setTopic] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const { user, setUser } = useAuthStore();
  const [mode, setMode] = useState<"standard" | "pro">("standard");

  const [clarificationData, setClarificationData] = useState<{
    jobId: string;
    reason: string;
    questions: any[];
  } | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  const { mutate, isPending } = useCreateCourse();

  useEffect(() => {
    if (isOpen) {
      if (user?.planType === "PRO" || user?.subscriptionStatus === "active") {
        setMode("pro");
      } else {
        setMode("standard");
      }
    }
  }, [isOpen, user]);

  const isPro =
    user?.planType === "PRO" || user?.subscriptionStatus === "active";
  // console.log("Is Pro User:", isPro);
  const currentCost =
    mode === "pro"
      ? getCost("createCoursePro") || 100
      : getCost("createCourse") || 50;
  // console.log("Current Cost:", currentCost);

  const credits = user?.credits || 0;
  const canAfford =
    credits >= currentCost || (mode === "pro" && !user?.hasUsedProTrial);

  const handleGenerate = () => {
    if (!topic.trim() || !canAfford) return;

    setClarificationData(null);

    mutate(
      { topic, mode },
      {
        onSuccess: (data: any) => {
          if (data?.code === "CLARIFICATION_NEEDED") {
            if (data.data) setClarificationData(data.data);
            return;
          }
          if (data.jobId) {
            setJobId(data.jobId);
            if (user && !data.isTrial)
              setUser({ ...user, credits: user.credits - currentCost });
          }
        },
        onError: () => {
          // toaster.create({ title: "Generation Failed", type: "error" });
        },
      },
    );
  };

  const handleResume = async (answers: Record<string, string>) => {
    if (!clarificationData) return;
    setIsResuming(true);

    try {
      const { data } = await api.post("/courses/resume", {
        jobId: clarificationData.jobId,
        answers,
      });

      if (data.jobId) {
        setJobId(data.jobId);
        setClarificationData(null);
      }
    } catch (error) {
      toaster.create({ title: "Failed to resume", type: "error" });
      setClarificationData(null);
    } finally {
      setIsResuming(false);
    }
  };

  const renderContent = () => {
    if (jobId) return <CourseTerminal jobId={jobId} />;

    if (clarificationData) {
      return (
        <ClarificationForm
          reason={clarificationData.reason}
          questions={clarificationData.questions}
          onSubmit={handleResume}
          isLoading={isResuming}
        />
      );
    }

    return (
      <VStack gap={6} align="stretch" py={4}>
        <Text fontSize="md" color="fg.muted" lineHeight="tall">
          Describe what you want to learn. Our AI will research and structure a
          custom course for you.
        </Text>

        <Field.Root invalid={!canAfford}>
          <Field.Label fontWeight="bold" color="fg.subtle">
            Topic or Goal
          </Field.Label>
          <Input
            placeholder="e.g. Advanced System Design using AWS..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            size="lg"
            rounded="2xl"
            bg="whiteAlpha.500"
            _dark={{ bg: "blackAlpha.400" }}
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            _focus={{
              borderColor: "purple.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-purple-400)",
            }}
            py={6}
          />
        </Field.Root>

        {/* Mode & Cost */}
        <HStack gap={4} w="full">
          <HStack
            flex={1}
            justify="space-between"
            bg="whiteAlpha.200"
            p={3}
            rounded="2xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
          >
            <HStack>
              <Box
                p={2}
                bg={mode === "pro" ? "purple.500" : "gray.500"}
                rounded="lg"
                color="white"
              >
                <Icon as={FaGem} />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontWeight="bold" fontSize="sm">
                  Pro Mode
                </Text>
                <Text fontSize="xs" color="fg.muted">
                  Deep reasoning
                </Text>
              </VStack>
            </HStack>
            <Switch.Root
              checked={mode === "pro"}
              onCheckedChange={(e) =>
                isPro && setMode(e.checked ? "pro" : "standard")
              }
              disabled={!isPro}
              colorPalette="purple"
            >
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>

          <HStack
            flex={1}
            justify="space-between"
            bg={canAfford ? "blue.500/10" : "red.500/10"}
            p={3}
            rounded="2xl"
            borderWidth="1px"
            borderColor={canAfford ? "blue.500/20" : "red.500/20"}
          >
            <HStack>
              <Box
                p={2}
                bg={canAfford ? "blue.500" : "red.500"}
                rounded="lg"
                color="white"
              >
                <Icon as={canAfford ? FaCoins : FaExclamationCircle} />
              </Box>
              <VStack align="start" gap={0}>
                <Text fontWeight="bold" fontSize="sm">
                  Cost
                </Text>
                <Text fontSize="xs" color={canAfford ? "blue.400" : "red.400"}>
                  {currentCost} Credits
                </Text>
              </VStack>
            </HStack>
          </HStack>
        </HStack>
      </VStack>
    );
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={() => !jobId && onClose()}
      placement="center"
      size="lg"
      closeOnInteractOutside={!jobId && !isPending && !isResuming}
    >
      <Portal>
        <Dialog.Backdrop bg="blackAlpha.600" backdropFilter="blur(12px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="rgba(255, 255, 255, 0.85)"
            _dark={{
              bg: "rgba(20, 20, 20, 0.9)",
              borderColor: "whiteAlpha.100",
            }}
            backdropFilter="blur(30px) saturate(180%)"
            boxShadow="0 40px 80px -12px rgba(0, 0, 0, 0.5)"
            borderRadius="3xl"
            borderWidth="1px"
            borderColor="whiteAlpha.400"
            p={4}
            transition="all 0.3s ease"
          >
            <Dialog.Header>
              <Dialog.Title
                fontSize="2xl"
                fontWeight="bold"
                letterSpacing="tight"
              >
                {jobId
                  ? "Constructing..."
                  : clarificationData
                    ? "Refining Scope"
                    : "Create Course"}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={2}>{renderContent()}</Dialog.Body>
            {!jobId && !clarificationData && (
              <Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    rounded="xl"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </Dialog.CloseTrigger>
                <Button
                  colorPalette={mode === "pro" ? "purple" : "blue"}
                  onClick={handleGenerate}
                  loading={isPending}
                  loadingText="Thinking..."
                  disabled={!canAfford || !topic.trim()}
                  rounded="xl"
                  size="lg"
                  px={8}
                  shadow="lg"
                  _hover={
                    canAfford
                      ? { transform: "translateY(-2px)", shadow: "xl" }
                      : {}
                  }
                  transition="all 0.2s"
                >
                  {!isPending && canAfford && (
                    <FaMagic style={{ marginRight: "8px" }} />
                  )}
                  {isPending
                    ? "Queueing..."
                    : !canAfford
                      ? "Insufficient Credits"
                      : "Generate"}{" "}
                </Button>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
