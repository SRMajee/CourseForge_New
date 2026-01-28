import {
  Box,
  Heading,
  Text,
  Code,
  VStack,
  Card,
  Icon,
  HStack,
  Link,
  Button,
} from "@chakra-ui/react";
import ReactMarkdown from "react-markdown";
import {
  FaPlay,
  FaQuestionCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaLightbulb,
  FaExternalLinkAlt,
  FaRedo,
  FaBookOpen, // 👈 Added for Reading Links
} from "react-icons/fa";
import { useState } from "react";

// --- Sub-Component for Interactive MCQs ---
const MCQBlock = ({ block }: { block: any }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const isAnswered = selectedOption !== null;

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOption(null);
  };

  return (
    <Card.Root
      variant="elevated"
      my={8}
      borderColor="border"
      borderWidth="1px"
      boxShadow="sm"
      borderRadius="xl"
      overflow="hidden"
      bg="bg.panel"
    >
      {/* Header Bar */}
      <Box
        bg={{ base: "purple.50", _dark: "purple.900/20" }}
        px={6}
        py={3}
        borderBottomWidth="1px"
        borderColor={{ base: "purple.100", _dark: "purple.800" }}
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <Icon color="purple.500" fontSize="lg">
              <FaQuestionCircle />
            </Icon>
            <Text fontWeight="bold" color="purple.500" fontSize="sm">
              KNOWLEDGE CHECK
            </Text>
          </HStack>
          {isAnswered && (
            <Button
              size="xs"
              variant="ghost"
              onClick={handleReset}
              colorPalette="gray"
            >
              <FaRedo /> Reset
            </Button>
          )}
        </HStack>
      </Box>

      <Card.Body p={6}>
        <Heading
          size="md"
          mb={6}
          fontWeight="semibold"
          lineHeight="shorter"
          color="fg.DEFAULT"
        >
          {block.question}
        </Heading>

        <VStack align="stretch" gap={3}>
          {block.options?.map((opt: string, idx: number) => {
            const isCorrectAnswer = idx === block.answer;
            const isSelected = idx === selectedOption;

            let borderColor = "border";
            let bgColor = "bg.subtle";
            let textColor = "fg.DEFAULT";
            let icon = null;
            let opacity = 1;

            if (isAnswered) {
              if (isCorrectAnswer) {
                borderColor = "green.500";
                bgColor = "green.500/10";
                textColor = "green.500";
                icon = (
                  <Icon color="green.500">
                    <FaCheckCircle />
                  </Icon>
                );
              } else if (isSelected && !isCorrectAnswer) {
                borderColor = "red.500";
                bgColor = "red.500/10";
                textColor = "red.500";
                icon = (
                  <Icon color="red.500">
                    <FaTimesCircle />
                  </Icon>
                );
              } else {
                opacity = 0.4;
              }
            }

            return (
              <Box
                key={idx}
                onClick={() => !isAnswered && setSelectedOption(idx)}
                cursor={isAnswered ? "default" : "pointer"}
                p={4}
                borderWidth={
                  isSelected || (isAnswered && isCorrectAnswer) ? "2px" : "1px"
                }
                borderRadius="lg"
                bg={bgColor}
                borderColor={
                  isSelected || (isAnswered && isCorrectAnswer)
                    ? borderColor
                    : "border"
                }
                color={textColor}
                opacity={opacity}
                _hover={
                  !isAnswered
                    ? {
                        borderColor: "purple.400",
                        bg: { base: "purple.50", _dark: "purple.900/20" },
                      }
                    : undefined
                }
                transition="all 0.2s ease-in-out"
              >
                <HStack justify="space-between">
                  <HStack gap={3}>
                    <Box
                      as="span"
                      fontWeight="bold"
                      px={2}
                      py={1}
                      borderRadius="md"
                      bg={
                        isAnswered && (isCorrectAnswer || isSelected)
                          ? "transparent"
                          : "bg.muted"
                      }
                      color={
                        isAnswered && (isCorrectAnswer || isSelected)
                          ? "inherit"
                          : "fg.muted"
                      }
                      fontSize="xs"
                      borderWidth="1px"
                      borderColor="border"
                    >
                      {String.fromCharCode(65 + idx)}
                    </Box>
                    <Text
                      fontWeight={
                        isSelected || (isAnswered && isCorrectAnswer)
                          ? "bold"
                          : "normal"
                      }
                    >
                      {opt}
                    </Text>
                  </HStack>
                  {icon}
                </HStack>
              </Box>
            );
          })}
        </VStack>

        {isAnswered && block.explanation && (
          <Box
            mt={6}
            p={4}
            borderRadius="lg"
            borderLeftWidth="4px"
            bg="blue.500/10"
            borderLeftColor="blue.500"
            animation="fade-in 0.4s"
          >
            <HStack mb={2} color="blue.500">
              <Icon>
                <FaLightbulb />
              </Icon>
              <Text fontSize="sm" fontWeight="bold">
                Explanation
              </Text>
            </HStack>
            <Text fontSize="sm" color="fg.DEFAULT" lineHeight="tall">
              {block.explanation}
            </Text>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  );
};

// --- Main Block Renderer ---
const BlockRenderer = ({ block }: { block: any }) => {
  switch (block.type) {
    case "heading":
      return (
        <Heading
          size="lg"
          mt={8}
          mb={4}
          color="blue.500"
          borderBottomWidth="1px"
          borderColor="border"
          pb={2}
        >
          {block.text}
        </Heading>
      );

    case "paragraph":
      return (
        <Box
          fontSize="lg"
          lineHeight="1.8"
          color="fg.muted"
          mb={4}
          className="markdown-body"
        >
          <ReactMarkdown>{block.text}</ReactMarkdown>
        </Box>
      );

    case "code":
      return (
        <Box
          my={6}
          borderRadius="lg"
          overflow="hidden"
          borderWidth="1px"
          borderColor="border"
          boxShadow="sm"
        >
          <HStack
            bg="bg.subtle"
            px={4}
            py={2}
            justify="space-between"
            borderBottomWidth="1px"
            borderColor="border"
          >
            <Text
              color="fg.muted"
              fontSize="xs"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              {block.language || "Code"}
            </Text>
          </HStack>
          <Box bg="#0d1117" p={5} overflowX="auto">
            <Code
              variant="plain"
              color="gray.100"
              whiteSpace="pre"
              fontFamily="'Fira Code', monospace"
              fontSize="sm"
            >
              {block.code || block.text}
            </Code>
          </Box>
        </Box>
      );

    // 👇 NEW: Link / Reading Block
    case "link":
      return (
        <Link
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          _hover={{ textDecoration: "none" }}
          w="full"
          display="block"
        >
          <Card.Root
            variant="outline"
            my={6}
            bg="blue.50"
            _dark={{ bg: "blue.900/10", borderColor: "blue.800" }} // Dark mode tint
            borderColor="blue.200"
            borderWidth="1px"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              borderColor: "blue.400",
              boxShadow: "sm",
              transform: "translateY(-1px)",
            }}
            borderRadius="lg"
          >
            <Card.Body flexDirection="row" gap={4} alignItems="start">
              <Box
                bg="blue.500"
                p={2}
                borderRadius="md"
                color="white"
                mt={1}
                flexShrink={0}
              >
                <Icon fontSize="lg">
                  <FaBookOpen />
                </Icon>
              </Box>
              <VStack align="start" gap={1} flex="1">
                <HStack width="full" justify="space-between">
                  <Text
                    fontWeight="bold"
                    color="blue.700"
                    _dark={{ color: "blue.300" }}
                  >
                    {block.title}
                  </Text>
                  <Icon color="blue.400" size="xs">
                    <FaExternalLinkAlt />
                  </Icon>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  {block.description}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Link>
      );

    case "video":
      const query = block.title;
      const youtubeUrl = block.url;

      return (
        <Link
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          _hover={{ textDecoration: "none" }}
          w="full"
          display="block"
        >
          <Card.Root
            variant="subtle"
            my={6}
            bg="bg.panel"
            borderColor="border"
            borderWidth="1px"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              borderColor: "red.500",
              boxShadow: "md",
              transform: "translateY(-2px)",
            }}
            borderRadius="lg"
          >
            <Card.Body flexDirection="row" gap={5} alignItems="center">
              <Box
                bg="red.500/10"
                p={3}
                borderRadius="full"
                color="red.500"
                borderWidth="1px"
                borderColor="red.500/20"
              >
                <Icon fontSize="xl">
                  <FaPlay />
                </Icon>
              </Box>
              <Box flex="1">
                <HStack mb={1}>
                  <Text fontWeight="bold" color="fg.DEFAULT">
                    Watch on YouTube
                  </Text>
                  <Icon color="fg.muted" size="xs">
                    <FaExternalLinkAlt />
                  </Icon>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Search: "{query}"
                </Text>
              </Box>
            </Card.Body>
          </Card.Root>
        </Link>
      );

    case "mcq":
      return <MCQBlock block={block} />;

    default:
      console.warn("Unknown block type:", block.type);
      return null;
  }
};

export const LessonContentRenderer = ({ content }: { content: any[] }) => {
  if (!content || !Array.isArray(content)) return null;

  return (
    <Box maxW="3xl" mx="auto" px={1}>
      {content.map((block, index) => (
        <BlockRenderer key={index} block={block} />
      ))}
    </Box>
  );
};
