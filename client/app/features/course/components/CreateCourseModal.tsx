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

const CREATE_COST = import.meta.env.VITE_COST_COURSE_CONTENT;

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCourseModal = ({
  isOpen,
  onClose,
}: CreateCourseModalProps) => {
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

    mutate(topic, {
      onSuccess: (data: any) => {
        if (data.jobId) {
          setJobId(data.jobId);
          if (user) setUser({ ...user, credits: user.credits - CREATE_COST });
        }
      },
      onError: (error: any) => {
        const errData = error.response?.data;
        const status = error.response?.status;

        // ✅ FIX: Check for 422 status OR the specific code
        // This prevents the "Generation Failed" toaster when we just need clarification
        if (status === 422 || errData?.code === "CLARIFICATION_NEEDED") {
          if (errData?.data) {
            setClarificationData(errData.data);
            return; // 🛑 EXIT EARLY: Do NOT show the error toaster
          }
        }

        // Only show toaster for REAL errors (500, Network Error, etc.)
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
    } finally {
      setIsResuming(false);
    }
  };

  const handleClose = () => {
    if (jobId) return;
    setTopic("");
    setJobId(null);
    setClarificationData(null);
    onClose();
  };

  // --- RENDER HELPERS ---
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
      <VStack gap={4} align="stretch">
        <Text fontSize="sm" color="fg.muted">
          Enter a topic, and our AI will generate a complete syllabus for you.
        </Text>

        <Field.Root invalid={!canAfford}>
          <Field.Label>Course Topic</Field.Label>
          <Input
            placeholder="e.g. Python for Data Science, History of Rome..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          />
        </Field.Root>

        <HStack
          justify="space-between"
          bg={canAfford ? "blue.50" : "red.50"}
          p={3}
          rounded="md"
          _dark={{ bg: canAfford ? "blue.900" : "red.900" }}
        >
          <HStack gap={2}>
            <Icon color={canAfford ? "blue.500" : "red.500"}>
              {canAfford ? <FaCoins /> : <FaExclamationCircle />}
            </Icon>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={canAfford ? "blue.700" : "red.300"}
            >
              {canAfford
                ? `Balance: ${credits} Credits`
                : `Insufficient Funds (${credits} left)`}
            </Text>
          </HStack>

          <Badge colorPalette="gray" variant="surface">
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
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                {jobId
                  ? "Building Course..."
                  : clarificationData
                    ? "Clarification Needed"
                    : "Generate New Course"}
              </Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>{renderContent()}</Dialog.Body>

            {!jobId && !clarificationData && (
              <Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <Button variant="outline" disabled={isPending}>
                    Cancel
                  </Button>
                </Dialog.CloseTrigger>

                <Button
                  colorPalette="blue"
                  onClick={handleGenerate}
                  loading={isPending}
                  loadingText="Queueing..."
                  disabled={!canAfford || !topic.trim()}
                >
                  {!isPending && <FaMagic />}
                  {isPending ? "Queueing..." : `Generate (-${CREATE_COST})`}
                </Button>
              </Dialog.Footer>
            )}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
