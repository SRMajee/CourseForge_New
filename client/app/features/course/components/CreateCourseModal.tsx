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
} from "@chakra-ui/react";
import { useState } from "react";
import { useCreateCourse } from "../hooks/useCreateCourse";
import { FaMagic, FaCoins, FaExclamationCircle } from "react-icons/fa";
import { useAuthStore } from "~/store/authStore";
import { fireSuccessBurst } from "~/utils/confetti";
import { CourseTerminal } from "./CourseTerminal"; // 👈 New Terminal Component

const CREATE_COST = 10;

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCourseModal = ({
  isOpen,
  onClose,
}: CreateCourseModalProps) => {
  const [topic, setTopic] = useState("");
  const [jobId, setJobId] = useState<string | null>(null); // 👈 Track Async Job

  const { mutate, isPending } = useCreateCourse();

  const { user, setUser } = useAuthStore();
  const credits = user?.credits || 0;
  const canAfford = credits >= CREATE_COST;

  const handleGenerate = () => {
    if (!topic.trim() || !canAfford) return;

    mutate(topic, {
      onSuccess: (data: any) => {
        // The API now returns { jobId: "..." } immediately
        if (data.jobId) {
          setJobId(data.jobId);
          // fireSuccessBurst();

          // Deduct credits visually immediately (Optimistic UI)
          if (user) {
            setUser({ ...user, credits: user.credits - CREATE_COST });
          }
        }
      },
      onError: (error) => {
        console.error("Generation failed", error);
      },
    });
  };

  const handleClose = () => {
    // Only close if NOT processing
    if (jobId) return;
    setTopic("");
    setJobId(null);
    onClose();
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(details) => !jobId && onClose()} // Prevent close if job running
      placement="center"
      size="lg"
      closeOnInteractOutside={!jobId && !isPending}
    >
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              {jobId ? "Building Course..." : "Generate New Course"}
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body>
            {jobId ? (
              /* --- STATE 2: TERMINAL UI --- */
              <Box py={2}>
                <CourseTerminal jobId={jobId} />
              </Box>
            ) : (
              /* --- STATE 1: INPUT FORM --- */
              <VStack gap={4} align="stretch">
                <Text fontSize="sm" color="fg.muted">
                  Enter a topic, and our AI will generate a complete syllabus
                  for you.
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
            )}
          </Dialog.Body>

          {!jobId && (
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
    </Dialog.Root>
  );
};
