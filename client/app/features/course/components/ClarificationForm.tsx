import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  Icon,
  Input,
  Kbd,
  Badge,
  Separator,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { FaTerminal, FaChevronRight, FaArrowRight } from "react-icons/fa";

interface Question {
  id: string;
  text: string;
  options: string[];
  type: "choice" | "text";
}

interface ClarificationFormProps {
  reason: string;
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  isLoading: boolean;
}

export const ClarificationForm = ({
  reason,
  questions,
  onSubmit,
  isLoading,
}: ClarificationFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [textInput, setTextInput] = useState("");

  // Terminal History Logs
  const [logs, setLogs] = useState<string[]>([
    "> INITIALIZING CLARIFICATION PROTOCOL...",
    `> SYSTEM ALERT: Ambiguity Detected.`,
    `> REASON: "${reason}"`,
    "> STANDBY FOR USER INPUT...",
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const currentQuestion = questions[currentStep];
  const isComplete = currentStep >= questions.length;

  // Auto-scroll to bottom of logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, currentStep]);
  useEffect(() => {
    if (isComplete && !isLoading) {
      // Go back to the last question so the user isn't stuck on the spinner
      setCurrentStep(questions.length - 1);
      addLog(
        "❌ Error: Transmission failed or rejected. Please retry.",
        "info",
      );
    }
  }, [isLoading, isComplete, questions.length]);
  const addLog = (message: string, type: "info" | "user" = "info") => {
    const prefix = type === "user" ? "root@user:~$" : ">";
    setLogs((prev) => [...prev, `${prefix} ${message}`]);
  };

  const handleAnswer = (questionId: string, value: string) => {
    // 1. Log the choice
    addLog(`Selected: "${value}"`, "user");

    // 2. Save Answer
    // Filter out "Decide for me" to keep it clean (backend treats missing key as skip anyway)
    if (!value.includes("Decide for me")) {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
    } else {
      addLog("Skipping parameter configuration...", "info");
    }

    // 3. Advance
    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        finishSequence();
      }
    }, 400);
  };

  const finishSequence = () => {
    setCurrentStep(questions.length); // Move to "Complete" state
    addLog("CONFIGURATION COMPLETE.", "info");
    addLog("RESUMING GENERATION SEQUENCE...", "info");

    // Slight delay for effect before actual submit
    setTimeout(() => {
      onSubmit(answers);
    }, 800);
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim()) return; // Prevent empty (use skip button instead)

    handleAnswer(currentQuestion.id, textInput);
    setTextInput("");
  };

  // --- RENDER ---

  return (
    <Box
      bg="gray.950"
      color="green.400"
      p={6}
      borderRadius="xl"
      fontFamily="mono"
      boxShadow="2xl"
      borderWidth="1px"
      borderColor="gray.800"
      w="full"
      h="500px" // Fixed height for terminal feel
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <HStack
        justify="space-between"
        mb={4}
        borderBottomWidth="1px"
        borderColor="gray.800"
        pb={3}
      >
        <HStack>
          <Icon as={FaTerminal} />
          <Text fontWeight="bold">Clarification Terminal</Text>
        </HStack>
        <Badge colorPalette="yellow" variant="solid">
          INTERACTIVE_MODE
        </Badge>
      </HStack>

      {/* Logs Area (Scrollable) */}
      <VStack
        align="start"
        flex="1"
        overflowY="auto"
        gap={2}
        fontSize="sm"
        mb={4}
        css={{
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: "#48BB78",
            borderRadius: "24px",
          },
        }}
      >
        {logs.map((log, i) => (
          <Text key={i} opacity={0.8} wordBreak="break-word">
            {log}
          </Text>
        ))}
        <div ref={bottomRef} />
      </VStack>

      {/* Interactive Zone (Bottom) */}
      <Box borderTopWidth="1px" borderColor="gray.800" pt={4}>
        {!isComplete ? (
          <VStack align="stretch" gap={4}>
            {/* Question Text */}
            <Text color="white" fontWeight="bold" fontSize="md">
              <Text as="span" color="green.500" mr={2}>
                ?
              </Text>
              [{currentStep + 1}/{questions.length}] {currentQuestion.text}
            </Text>

            {/* Options */}
            {currentQuestion.type === "choice" ? (
              <VStack align="stretch" gap={2}>
                {currentQuestion.options.map((opt, idx) => (
                  <Button
                    key={opt}
                    variant="ghost"
                    justifyContent="flex-start"
                    color="green.300"
                    _hover={{ bg: "whiteAlpha.100", color: "green.100" }}
                    onClick={() => handleAnswer(currentQuestion.id, opt)}
                    h="auto"
                    py={2}
                  >
                    <HStack width="full">
                      <Badge variant="outline" colorPalette="gray" size="sm">
                        {idx + 1}
                      </Badge>
                      <Text>{opt}</Text>
                    </HStack>
                  </Button>
                ))}
              </VStack>
            ) : (
              // Text Input Mode
              <form onSubmit={handleTextSubmit}>
                <HStack>
                  <Text color="green.500">{">"}</Text>
                  <Input
                    autoFocus
                    variant="flushed"
                    borderColor="gray.700"
                    color="white"
                    placeholder="Type answer..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    _focus={{ borderColor: "green.500" }}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="ghost"
                    color="green.400"
                  >
                    ENTER
                  </Button>
                </HStack>
              </form>
            )}

            {/* Skip Option */}
            <HStack justify="flex-end">
              <Button
                size="xs"
                variant="plain"
                color="gray.500"
                _hover={{ color: "gray.300" }}
                onClick={() =>
                  handleAnswer(currentQuestion.id, "Decide for me")
                }
              >
                [SKIP / AUTO]
              </Button>
            </HStack>
          </VStack>
        ) : (
          // Loading State (Post-Completion)
          <HStack justify="center" py={4} color="green.400" gap={3}>
            <Box className="animate-spin" fontSize="xl">
              <Icon as={FaTerminal} /> {/* Or a spinner */}
            </Box>
            <Text>TRANSMITTING DATA...</Text>
          </HStack>
        )}
      </Box>
    </Box>
  );
};
