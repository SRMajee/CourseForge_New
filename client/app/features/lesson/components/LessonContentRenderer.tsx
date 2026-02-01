import {
  Box,
  Heading,
  Text,
  VStack,
  Card,
  Icon,
  HStack,
  Link,
  Button,
  Image,
  AspectRatio,
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
  FaBookOpen,
} from "react-icons/fa";
import { useState } from "react";
import { CodeSandbox } from "./CodeSandbox";

// --- Helper to extract YouTube ID ---
const getYoutubeThumbnail = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = match && match[2].length === 11 ? match[2] : null;
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
};

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
      // ✅ LIQUID GLASS MCQ
      bg="rgba(255, 255, 255, 0.6)"
      _dark={{ bg: "rgba(30, 30, 30, 0.6)" }}
      backdropFilter="blur(20px) saturate(180%)"
      borderColor="whiteAlpha.300"
      borderWidth="1px"
      boxShadow="lg"
      borderRadius="2xl"
      overflow="hidden"
    >
      {/* Header Bar */}
      <Box
        bg="purple.500/10"
        px={6}
        py={4}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <Icon color="purple.400" fontSize="lg">
              <FaQuestionCircle />
            </Icon>
            <Text fontWeight="bold" color="purple.400" fontSize="sm">
              KNOWLEDGE CHECK
            </Text>
          </HStack>
          {isAnswered && (
            <Button
              size="xs"
              variant="ghost"
              onClick={handleReset}
              colorPalette="gray"
              _hover={{ bg: "whiteAlpha.200" }}
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

            let borderColor = "whiteAlpha.200";
            let bgColor = "whiteAlpha.50";
            let textColor = "fg.DEFAULT";
            let icon = null;
            let opacity = 1;

            if (isAnswered) {
              if (isCorrectAnswer) {
                borderColor = "green.500/50";
                bgColor = "green.500/10";
                textColor = "green.400";
                icon = (
                  <Icon color="green.400">
                    <FaCheckCircle />
                  </Icon>
                );
              } else if (isSelected && !isCorrectAnswer) {
                borderColor = "red.500/50";
                bgColor = "red.500/10";
                textColor = "red.400";
                icon = (
                  <Icon color="red.400">
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
                borderRadius="xl"
                bg={bgColor}
                borderColor={borderColor}
                color={textColor}
                opacity={opacity}
                _hover={
                  !isAnswered
                    ? {
                        borderColor: "purple.400/50",
                        bg: "purple.500/5",
                        transform: "translateY(-1px)",
                        shadow: "md",
                      }
                    : undefined
                }
                transition="all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)"
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
                          : "whiteAlpha.200"
                      }
                      fontSize="xs"
                    >
                      {String.fromCharCode(65 + idx)}
                    </Box>
                    <Text
                      fontWeight={
                        isSelected || (isAnswered && isCorrectAnswer)
                          ? "bold"
                          : "medium"
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
            borderRadius="xl"
            borderLeftWidth="4px"
            bg="blue.500/10"
            borderLeftColor="blue.400"
            animation="fade-in 0.4s"
          >
            <HStack mb={2} color="blue.400">
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

const BlockRenderer = ({
  index,
  block,
  lessonId,
}: {
  index: number;
  block: any;
  lessonId: string;
}) => {
  switch (block.type) {
    case "heading":
      return (
        <Heading
          size="lg"
          mt={10}
          mb={6}
          bgGradient="to-r"
          gradientFrom="blue.400"
          gradientTo="purple.400"
          bgClip="text"
          fontWeight="extrabold"
          letterSpacing="tight"
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
          mb={6}
          className="markdown-body"
        >
          <ReactMarkdown>{block.text}</ReactMarkdown>
        </Box>
      );

    case "code":
      return (
        <CodeSandbox
          key={index}
          lessonId={lessonId}
          blockIndex={index}
          initialCode={block.code || block.text || ""}
          language={block.language || "javascript"}
        />
      );

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
            bg="whiteAlpha.100"
            _dark={{ bg: "whiteAlpha.50" }}
            backdropFilter="blur(10px)"
            borderColor="whiteAlpha.200"
            borderWidth="1px"
            cursor="pointer"
            transition="all 0.3s"
            _hover={{
              borderColor: "blue.400",
              boxShadow: "lg",
              transform: "translateY(-2px)",
              bg: "whiteAlpha.200",
            }}
            borderRadius="xl"
          >
            <Card.Body flexDirection="row" gap={4} alignItems="start">
              <Box
                bg="blue.500"
                p={3}
                borderRadius="lg"
                color="white"
                flexShrink={0}
                boxShadow="md"
              >
                <Icon fontSize="xl">
                  <FaBookOpen />
                </Icon>
              </Box>
              <VStack align="start" gap={1} flex="1">
                <HStack width="full" justify="space-between">
                  <Text
                    fontWeight="bold"
                    color="blue.600"
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
      // ✅ FIX: Get explicit thumbnail or derive from URL
      const thumbnail = block.thumbnail || getYoutubeThumbnail(youtubeUrl);

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
            my={8}
            // ✅ LIQUID GLASS VIDEO CARD
            bg="rgba(0,0,0,0.2)"
            borderColor="whiteAlpha.200"
            borderWidth="1px"
            cursor="pointer"
            transition="all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)"
            _hover={{
              borderColor: "red.500/50",
              boxShadow: "0 10px 30px -10px rgba(229, 62, 62, 0.4)",
              transform: "scale(1.02)",
            }}
            borderRadius="2xl"
            overflow="hidden"
          >
            {/* ✅ RESTORED THUMBNAIL DISPLAY */}
            {thumbnail ? (
              <Box position="relative">
                <AspectRatio ratio={16 / 9}>
                  <Image src={thumbnail} objectFit="cover" alt={query} />
                </AspectRatio>
                {/* Play Button Overlay */}
                <Box
                  position="absolute"
                  inset="0"
                  bg="blackAlpha.400"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  _groupHover={{ bg: "blackAlpha.200" }}
                  transition="background 0.2s"
                >
                  <Box
                    bg="red.600"
                    color="white"
                    rounded="full"
                    p={4}
                    boxShadow="xl"
                    transform="scale(1)"
                    transition="transform 0.2s"
                    _groupHover={{ transform: "scale(1.1)" }}
                  >
                    <FaPlay size={24} style={{ marginLeft: "4px" }} />
                  </Box>
                </Box>
              </Box>
            ) : null}

            <Card.Body
              flexDirection="row"
              gap={5}
              alignItems="center"
              bg="whiteAlpha.100"
              backdropFilter="blur(10px)"
            >
              {/* Fallback Icon if no thumbnail */}
              {!thumbnail && (
                <Box
                  bg="red.500/10"
                  p={4}
                  borderRadius="full"
                  color="red.500"
                  borderWidth="1px"
                  borderColor="red.500/20"
                >
                  <Icon fontSize="2xl">
                    <FaPlay />
                  </Icon>
                </Box>
              )}
              <Box flex="1">
                <HStack mb={1}>
                  <Text fontWeight="bold" color="fg.DEFAULT">
                    Recommended Video
                  </Text>
                  <Icon color="fg.muted" size="xs">
                    <FaExternalLinkAlt />
                  </Icon>
                </HStack>
                <Text fontSize="sm" color="fg.muted" lineClamp={1}>
                  {query}
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

export const LessonContentRenderer = ({
  content,
  lessonId,
}: {
  content: any[];
  lessonId: string;
}) => {
  if (!content || !Array.isArray(content)) return null;

  return (
    <Box maxW="3xl" mx="auto" px={1}>
      {content.map((block, index) => (
        <BlockRenderer
          key={index}
          index={index}
          block={block}
          lessonId={lessonId}
        />
      ))}
    </Box>
  );
};
