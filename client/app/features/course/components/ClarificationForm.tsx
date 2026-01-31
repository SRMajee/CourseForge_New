import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  Icon,
  Input,
  Badge,
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { FaTerminal } from "react-icons/fa";

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
  const [textInput, setTextInput] = useState("");

  // ✅ CRITICAL FIX: Use Ref for answers to prevent stale state in timeouts
  // This solves the "Missing Answers" issue.
  const answersRef = useRef<Record<string, string>>({});

  // ✅ CRITICAL FIX: Track submission state to prevent premature error
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const [logs, setLogs] = useState<string[]>([
    "> INITIALIZING CLARIFICATION PROTOCOL...",
    `> SYSTEM ALERT: Ambiguity Detected.`,
    `> REASON: "${reason}"`,
    "> STANDBY FOR USER INPUT...",
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const currentQuestion = questions[currentStep];
  const isComplete = currentStep >= questions.length;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, currentStep]);

  // ✅ ROBUST ERROR CHECK: Only show error if we ACTUALLY submitted
  useEffect(() => {
    if (isComplete && hasSubmitted && !isLoading) {
      setCurrentStep(questions.length - 1);
      addLog(
        "❌ Error: Transmission failed or rejected. Please retry.",
        "info",
      );
      setHasSubmitted(false); // Reset to allow retry
    }
  }, [isLoading, isComplete, hasSubmitted, questions.length]);

  const addLog = (message: string, type: "info" | "user" = "info") => {
    const prefix = type === "user" ? "root@user:~$" : ">";
    setLogs((prev) => [...prev, `${prefix} ${message}`]);
  };

  const handleAnswer = (questionId: string, value: string) => {
    addLog(`Selected: "${value}"`, "user");

    // Update Ref IMMEDIATELY (Source of Truth)
    if (!value.includes("Decide for me")) {
      answersRef.current = { ...answersRef.current, [questionId]: value };
    } else {
      addLog("Skipping parameter configuration...", "info");
    }

    setTimeout(() => {
      if (currentStep < questions.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        finishSequence();
      }
    }, 400);
  };

  const finishSequence = () => {
    setCurrentStep(questions.length);
    addLog("CONFIGURATION COMPLETE.", "info");
    addLog("RESUMING GENERATION SEQUENCE...", "info");

    setTimeout(() => {
      // ✅ Send Ref.current (Contains ALL answers guaranteed)
      console.log("🚀 Submitting Answers:", answersRef.current);
      onSubmit(answersRef.current);
      setHasSubmitted(true); // Now we wait for loading to toggle
    }, 800);
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim()) return;
    handleAnswer(currentQuestion.id, textInput);
    setTextInput("");
  };

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
      h="500px"
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

      {/* Logs */}
      <VStack
        align="start"
        flex="1"
        overflowY="auto"
        gap={2}
        fontSize="sm"
        mb={4}
        css={{ "&::-webkit-scrollbar": { display: "none" } }}
      >
        {logs.map((log, i) => (
          <Text key={i} opacity={0.8} wordBreak="break-word">
            {log}
          </Text>
        ))}
        <div ref={bottomRef} />
      </VStack>

      {/* Input Area */}
      <Box borderTopWidth="1px" borderColor="gray.800" pt={4}>
        {!isComplete ? (
          <VStack align="stretch" gap={4}>
            <Text color="white" fontWeight="bold" fontSize="md">
              <Text as="span" color="green.500" mr={2}>
                ?
              </Text>
              [{currentStep + 1}/{questions.length}] {currentQuestion.text}
            </Text>

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
          <HStack justify="center" py={4} color="green.400" gap={3}>
            <Box className="animate-spin" fontSize="xl">
              <Icon as={FaTerminal} />
            </Box>
            <Text>TRANSMITTING DATA...</Text>
          </HStack>
        )}
      </Box>
    </Box>
  );
};
