import {
  Dialog,
  Button,
  Input,
  VStack,
  Text,
  Field,
  HStack,
  Badge,
  Icon,
  Box,
  Portal,
} from "@chakra-ui/react";
import { useState } from "react";
import { useCreateCourse } from "../hooks/useCreateCourse";
import { FaMagic, FaCoins, FaExclamationCircle } from "react-icons/fa";
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

  // Dynamic Cost!
  const CREATE_COST = getCost("createCourse");
  const [topic, setTopic] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);

  const [clarificationData, setClarificationData] = useState<{
    jobId: string;
    reason: string;
    questions: any[];
  } | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  const { mutate, isPending } = useCreateCourse();
  const { user, setUser } = useAuthStore();
  const credits = user?.credits || 0;
  const canAfford = credits >= CREATE_COST;

  const handleGenerate = () => {
    if (!topic.trim() || !canAfford) return;

    setClarificationData(null);

    mutate({ topic }, {
      onSuccess: (data: any) => {
        if (data?.code === "CLARIFICATION_NEEDED") {
          if (data.data) setClarificationData(data.data);
          return;
        }
        if (data.jobId) {
          setJobId(data.jobId);
          if (user) setUser({ ...user, credits: user.credits - CREATE_COST });
        }
      },
      onError: (error: any) => {
        console.error("Generation failed", error);
        toaster.create({ title: "Generation Failed", type: "error" });
      },
    });
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
        if (user) setUser({ ...user, credits: user.credits - CREATE_COST });
      }
    } catch (error) {
      console.error("Resume failed", error);
      toaster.create({ title: "Failed to resume", type: "error" });
      setClarificationData(null);
    } finally {
      setIsResuming(false);
    }
  };

  const renderContent = () => {
    if (jobId) {
      return (
        <Box py={2}>
          <CourseTerminal jobId={jobId} />
        </Box>
      );
    }

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
      <VStack gap={6} align="stretch">
        <Text fontSize="sm" color="fg.muted">
          Enter a topic, and our AI will generate a complete syllabus for you.
        </Text>

        <Field.Root invalid={!canAfford}>
          <Field.Label fontWeight="bold" color="fg.subtle">
            Course Topic
          </Field.Label>
          <Input
            placeholder="e.g. Python for Data Science, History of Rome..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            size="lg"
            rounded="xl"
            bg="whiteAlpha.200"
            _dark={{ bg: "blackAlpha.200" }}
            borderWidth="1px"
            borderColor="whiteAlpha.300"
            _focus={{
              borderColor: "blue.400",
              boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)",
            }}
          />
        </Field.Root>

        <HStack
          justify="space-between"
          bg={canAfford ? "blue.500/10" : "red.500/10"}
          p={4}
          rounded="xl"
          borderWidth="1px"
          borderColor={canAfford ? "blue.500/20" : "red.500/20"}
        >
          <HStack gap={2}>
            <Icon color={canAfford ? "blue.500" : "red.500"}>
              {canAfford ? <FaCoins /> : <FaExclamationCircle />}
            </Icon>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={canAfford ? "blue.600" : "red.400"}
              _dark={{ color: canAfford ? "blue.300" : "red.300" }}
            >
              {canAfford
                ? `Balance: ${credits} Credits`
                : `Insufficient Funds (${credits} left)`}
            </Text>
          </HStack>

          <Badge
            variant="surface"
            colorPalette="gray"
            bg="whiteAlpha.400"
            _dark={{ bg: "whiteAlpha.100" }}
          >
            Cost: {CREATE_COST}
          </Badge>
        </HStack>
      </VStack>
    );
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => !jobId && onClose()}
      placement="center"
      size="lg"
      closeOnInteractOutside={!jobId && !isPending && !isResuming}
    >
      <Portal>
        <Dialog.Backdrop
          bg="blackAlpha.600"
          backdropFilter="blur(10px)"
          animationDuration="0.3s"
        />
        <Dialog.Positioner>
          <Dialog.Content
            // ✅ LIQUID GLASS MODAL
            bg="rgba(255, 255, 255, 0.8)"
            _dark={{ bg: "rgba(20, 20, 20, 0.85)", borderColor: "whiteAlpha.100" }}
            backdropFilter="blur(24px) saturate(180%)"
            boxShadow="2xl"
            borderRadius="3xl"
            borderWidth="1px"
            borderColor="whiteAlpha.400"
            p={2}
          >
            <Dialog.Header>
              <Dialog.Title fontSize="xl" fontWeight="bold">
                {jobId
                  ? "Building Course..."
                  : clarificationData
                    ? "Clarification Needed"
                    : "Generate New Course"}
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body pb={6}>{renderContent()}</Dialog.Body>

            {!jobId && !clarificationData && (
              <Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <Button variant="ghost" disabled={isPending} rounded="lg">
                    Cancel
                  </Button>
                </Dialog.CloseTrigger>

                <Button
                  colorPalette="blue"
                  onClick={handleGenerate}
                  loading={isPending}
                  loadingText="Queueing..."
                  disabled={!canAfford || !topic.trim()}
                  rounded="lg"
                  size="md"
                  px={6}
                  shadow="md"
                >
                  {!isPending && <FaMagic style={{ marginRight: "8px" }} />}
                  {isPending ? "Queueing..." : `Generate`}
                </Button>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
