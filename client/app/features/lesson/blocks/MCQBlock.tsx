import { useState } from "react";
import {
  Box,
  Button,
  VStack,
  Text,
  RadioGroup,
  HStack,
  Badge,
} from "@chakra-ui/react";
// import { Radio } from "~/components/ui/radio"; // Or use standard Radio if CLI not installed

// Standard Chakra v3 Radio workaround if CLI components aren't present
import { RadioGroup as ChakraRadioGroup } from "@chakra-ui/react";

export const MCQBlock = ({
  question,
  options = [],
  answer,
  explanation,
}: {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isCorrect = selected !== null && parseInt(selected) === answer;

  return (
    <Box
      borderWidth="1px"
      p={6}
      rounded="lg"
      my={6}
      bg="bg.panel"
      borderColor={
        isSubmitted ? (isCorrect ? "green.500" : "red.500") : "border"
      }
    >
      <Text fontWeight="bold" mb={4}>
        {question}
      </Text>

      {/* Note: Chakra v3 RadioGroup logic differs slightly, using simple map for now */}
      <VStack align="stretch" gap={3}>
        {options.map((opt, idx) => (
          <Button
            key={idx}
            variant={selected === idx.toString() ? "solid" : "outline"}
            colorPalette={
              isSubmitted && idx === answer
                ? "green"
                : selected === idx.toString()
                  ? "blue"
                  : "gray"
            }
            justifyContent="flex-start"
            onClick={() => !isSubmitted && setSelected(idx.toString())}
            disabled={isSubmitted}
          >
            {opt}
          </Button>
        ))}
      </VStack>

      {!isSubmitted && (
        <Button
          mt={4}
          onClick={() => setIsSubmitted(true)}
          disabled={selected === null}
          colorPalette="blue"
        >
          Check Answer
        </Button>
      )}

      {isSubmitted && (
        <Box
          mt={4}
          p={3}
          bg={isCorrect ? "green.50" : "red.50"}
          rounded="md"
          _dark={{ bg: "whiteAlpha.100" }}
        >
          <Text fontWeight="bold" color={isCorrect ? "green.600" : "red.600"}>
            {isCorrect ? "Correct!" : "Incorrect."}
          </Text>
          {explanation && (
            <Text mt={1} fontSize="sm">
              {explanation}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
};
