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
  const answersRef = useRef<Record<string, string>>({});
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

  useEffect(() => {
    if (isComplete && hasSubmitted && !isLoading) {
      setCurrentStep(questions.length - 1);
      addLog(
        "❌ Error: Transmission failed or rejected. Please retry.",
        "info",
      );
      setHasSubmitted(false);
    }
  }, [isLoading, isComplete, hasSubmitted, questions.length]);

  const addLog = (message: string, type: "info" | "user" = "info") => {
    const prefix = type === "user" ? "root@user:~$" : ">";
    setLogs((prev) => [...prev, `${prefix} ${message}`]);
  };

  const handleAnswer = (questionId: string, value: string) => {
    addLog(`Selected: "${value}"`, "user");
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
      onSubmit(answersRef.current);
      setHasSubmitted(true);
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
      // ✅ DARK LIQUID GLASS TERMINAL
      bg="rgba(5, 5, 5, 0.85)"
      backdropFilter="blur(24px) saturate(150%)"
      color="green.400"
      p={6}
      borderRadius="2xl"
      fontFamily="mono"
      shadow="2xl"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      w="full"
      h="500px"
      display="flex"
      flexDirection="column"
      position="relative"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        boxShadow: "inset 0 0 60px rgba(0, 255, 0, 0.05)", // Subtle internal glow
        borderRadius: "2xl",
      }}
    >
      {/* Header */}
      <HStack
        justify="space-between"
        mb={4}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
        pb={3}
      >
        <HStack>
          <Icon as={FaTerminal} />
          <Text fontWeight="bold">Clarification Terminal</Text>
        </HStack>
        <Badge
          colorPalette="yellow"
          variant="solid"
          bg="yellow.500/20"
          color="yellow.300"
          borderWidth="1px"
          borderColor="yellow.500/40"
        >
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
      <Box borderTopWidth="1px" borderColor="whiteAlpha.100" pt={4}>
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
                    rounded="lg"
                  >
                    <HStack width="full">
                      <Badge
                        variant="outline"
                        colorPalette="gray"
                        size="sm"
                        borderColor="whiteAlpha.400"
                      >
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
                    borderColor="whiteAlpha.300"
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
                    _hover={{ bg: "whiteAlpha.100" }}
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
                color="whiteAlpha.500"
                _hover={{ color: "whiteAlpha.800" }}
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
