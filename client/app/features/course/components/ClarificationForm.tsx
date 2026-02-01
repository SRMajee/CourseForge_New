import {
  Box,
  VStack,
  Text,
  Button,
  HStack,
  Icon,
  Input,
  Badge,
  Flex,
  Avatar,
  IconButton,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useState, useEffect, useRef } from "react";
import { FaRobot, FaArrowRight, FaPaperPlane } from "react-icons/fa";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { opacity: 0.4; }
  50% { opacity: 1; }
  100% { opacity: 0.4; }
`;

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
  const [isTyping, setIsTyping] = useState(false);
  const answersRef = useRef<Record<string, string>>({});

  const [history, setHistory] = useState<
    { role: "ai" | "user"; content: string; id: string }[]
  >([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const currentQuestion = questions[currentStep];

  useEffect(() => {
    if (history.length === 0 && questions.length > 0) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setHistory([
          // { role: "ai", content: `I need to clarify: ${reason}`, id: "intro" },
          { role: "ai", content: questions[0].text, id: "q0" },
        ]);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isTyping]);

  const handleAnswer = (value: string) => {
    setHistory((prev) => [
      ...prev,
      { role: "user", content: value, id: Date.now().toString() },
    ]);

    if (!value.includes("Decide for me")) {
      answersRef.current = {
        ...answersRef.current,
        [currentQuestion.id]: value,
      };
    }

    setIsTyping(true);

    setTimeout(() => {
      const nextStep = currentStep + 1;
      if (nextStep < questions.length) {
        setCurrentStep(nextStep);
        setIsTyping(false);
        setHistory((prev) => [
          ...prev,
          { role: "ai", content: questions[nextStep].text, id: `q${nextStep}` },
        ]);
      } else {
        finishSequence();
      }
    }, 2500); // 2.5s Thinking delay
  };

  const finishSequence = () => {
    // ✅ Fix: Increment step to length so (currentStep < questions.length) becomes false
    setCurrentStep(questions.length);

    setIsTyping(false);
    setHistory((prev) => [
      ...prev,
      { role: "ai", content: "Great. Initializing generation...", id: "done" },
    ]);
    setTimeout(() => onSubmit(answersRef.current), 1000);
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim()) return;
    handleAnswer(textInput);
    setTextInput("");
  };

  return (
    <Box
      w="full"
      h="450px" // ✅ Reduced Height for compact view
      display="flex"
      flexDirection="column"
      position="relative"
      bg="rgba(255, 255, 255, 0.6)"
      _dark={{ bg: "rgba(20, 20, 20, 0.6)" }}
      backdropFilter="blur(30px) saturate(180%)"
      borderRadius="3xl"
      borderWidth="1px"
      borderColor="whiteAlpha.400"
      shadow="xl"
      overflow="hidden"
      animation={`${fadeIn} 0.4s ease-out`}
    >
      <HStack
        p={4}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.200"
        bg="whiteAlpha.50"
        justify="space-between"
      >
        <HStack color="purple.500">
          <Icon as={FaRobot} />
          <Text fontWeight="bold" fontSize="xs">
            CourseForge Architect
          </Text>
        </HStack>
        <Badge
          colorPalette="green"
          variant="solid"
          rounded="full"
          px={2}
          size="xs"
        >
          Live
        </Badge>
      </HStack>

      <VStack
        flex="1"
        overflowY="auto"
        p={5}
        gap={4}
        align="stretch"
        css={{ "&::-webkit-scrollbar": { display: "none" } }}
      >
        {history.map((msg) => (
          <Flex
            key={msg.id}
            justify={msg.role === "user" ? "flex-end" : "flex-start"}
            animation={`${fadeIn} 0.4s ease-out`}
          >
            <HStack
              align="end"
              gap={2}
              flexDirection={msg.role === "user" ? "row-reverse" : "row"}
            >
              {msg.role === "ai" && (
                <Avatar.Root size="2xs" bg="purple.500">
                  <Avatar.Fallback>
                    <FaRobot />
                  </Avatar.Fallback>
                </Avatar.Root>
              )}
              <Box
                maxW="85%"
                bg={msg.role === "user" ? "purple.600" : "whiteAlpha.800"}
                _dark={{
                  bg: msg.role === "user" ? "purple.600" : "whiteAlpha.200",
                }}
                color={msg.role === "user" ? "white" : "fg.default"}
                p={2.5}
                px={4}
                rounded="2xl"
                borderBottomRightRadius={msg.role === "user" ? "sm" : "2xl"}
                borderBottomLeftRadius={msg.role === "ai" ? "sm" : "2xl"}
                boxShadow="sm"
                fontSize="sm"
              >
                <Text>{msg.content}</Text>
              </Box>
            </HStack>
          </Flex>
        ))}

        {isTyping && (
          <Flex justify="flex-start" animation={`${fadeIn} 0.3s ease-out`}>
            <HStack
              bg="whiteAlpha.200"
              p={2.5}
              rounded="2xl"
              borderBottomLeftRadius="sm"
              gap={1}
            >
              <Box
                w="5px"
                h="5px"
                bg="purple.400"
                rounded="full"
                animation={`${pulse} 1s infinite`}
              />
              <Box
                w="5px"
                h="5px"
                bg="purple.400"
                rounded="full"
                animation={`${pulse} 1s infinite 0.2s`}
              />
              <Box
                w="5px"
                h="5px"
                bg="purple.400"
                rounded="full"
                animation={`${pulse} 1s infinite 0.4s`}
              />
            </HStack>
          </Flex>
        )}

        {!isTyping && currentStep < questions.length && history.length > 0 && (
          <Box animation={`${fadeIn} 0.5s ease-out forwards`} mt={1} pl={8}>
            {currentQuestion.type === "choice" ? (
              <Flex gap={2} wrap="wrap">
                {currentQuestion.options.map((opt) => (
                  <Button
                    key={opt}
                    size="xs" // Smaller buttons
                    variant="outline"
                    borderColor="purple.400"
                    color="purple.500"
                    _dark={{ color: "purple.300", borderColor: "purple.500" }}
                    rounded="full"
                    onClick={() => handleAnswer(opt)}
                    _hover={{
                      bg: "purple.500",
                      color: "white",
                      borderColor: "purple.500",
                    }}
                  >
                    {opt}
                  </Button>
                ))}
                <Button
                  size="xs"
                  variant="ghost"
                  color="gray.500"
                  onClick={() => handleAnswer("Decide for me")}
                >
                  Skip
                </Button>
              </Flex>
            ) : (
              <HStack w="full" maxW="350px">
                <Input
                  placeholder="Type..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSubmit(e)}
                  bg="whiteAlpha.500"
                  _dark={{ bg: "blackAlpha.400" }}
                  rounded="full"
                  size="sm"
                />
                <IconButton
                  aria-label="Send"
                  size="sm"
                  rounded="full"
                  colorPalette="purple"
                  onClick={handleTextSubmit}
                >
                  <FaPaperPlane />
                </IconButton>
              </HStack>
            )}
          </Box>
        )}
        <div ref={bottomRef} />
      </VStack>
    </Box>
  );
};
