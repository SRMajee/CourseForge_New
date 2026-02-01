import { useState } from "react";
import {
  Box,
  Button,
  HStack,
  Text,
  Textarea,
  Icon,
  Badge,
  VStack,
} from "@chakra-ui/react";
import { FaPlay, FaTerminal, FaSave, FaCheck, FaCopy } from "react-icons/fa";
import { CourseService } from "~/services/courseService";
import { toaster } from "~/components/ui/toaster";

interface CodeSandboxProps {
  lessonId: string;
  blockIndex: number;
  initialCode: string;
  language: string;
}

export const CodeSandbox = ({
  lessonId,
  blockIndex,
  initialCode,
  language,
}: CodeSandboxProps) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput("");
    try {
      const data = await CourseService.executeCode(language, code);
      setOutput(data.output || ">> No output returned.");
    } catch (error) {
      setOutput("❌ Error: Execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await CourseService.saveCode(lessonId, blockIndex, code, output);
      toaster.create({ title: "Code & Output Saved!", type: "success" });
    } catch (error) {
      toaster.create({ title: "Save Failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      // ✅ DARK LIQUID GLASS EDITOR
      bg="rgba(10, 10, 10, 0.7)"
      backdropFilter="blur(20px)"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      borderRadius="2xl"
      overflow="hidden"
      my={8}
      shadow="2xl"
      position="relative"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        boxShadow: "inset 0 0 40px rgba(0, 0, 0, 0.5)",
        borderRadius: "2xl",
      }}
    >
      {/* Header */}
      <HStack
        bg="whiteAlpha.50"
        p={2}
        px={4}
        justify="space-between"
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
      >
        <HStack gap={3}>
          <Icon as={FaTerminal} color="green.400" />
          <Text
            fontSize="xs"
            fontWeight="bold"
            color="whiteAlpha.700"
            textTransform="uppercase"
            letterSpacing="wider"
          >
            {language} Playground
          </Text>
        </HStack>

        <HStack gap={1}>
          <Button
            size="xs"
            variant="ghost"
            color="whiteAlpha.700"
            onClick={handleCopy}
            _hover={{ color: "white", bg: "whiteAlpha.200" }}
          >
            {copied ? <FaCheck /> : <FaCopy />} {copied ? "Copied" : "Copy"}
          </Button>

          <Button
            size="xs"
            variant="ghost"
            color="blue.300"
            onClick={handleSave}
            loading={isSaving}
            _hover={{ bg: "blue.500/20", color: "blue.200" }}
          >
            <FaSave /> {isSaving ? "Saving..." : "Save"}
          </Button>
        </HStack>
      </HStack>

      {/* Editor */}
      <VStack align="stretch" gap={0}>
        <Box position="relative">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            bg="transparent"
            color="gray.200"
            fontFamily="'Fira Code', monospace"
            fontSize="sm"
            border="none"
            _focus={{ ring: "none" }}
            minH="200px"
            p={6}
            resize="vertical"
            spellCheck={false}
            lineHeight="1.6"
          />
          <Badge
            position="absolute"
            bottom={4}
            right={4}
            colorPalette="blue"
            size="sm"
            variant="solid"
            opacity={0.3}
            pointerEvents="none"
          >
            EDITABLE
          </Badge>
        </Box>

        {/* Action Bar */}
        <HStack
          bg="whiteAlpha.50"
          p={3}
          justify="flex-end"
          borderTopWidth="1px"
          borderColor="whiteAlpha.100"
        >
          <Button
            size="sm"
            colorPalette="green"
            onClick={handleRun}
            loading={isRunning}
            px={6}
            rounded="full"
            shadow="md"
            _hover={{ transform: "scale(1.05)" }}
          >
            <FaPlay /> Run Code
          </Button>
        </HStack>

        {/* Output Console */}
        {(output || isRunning) && (
          <Box
            bg="black"
            color="green.300"
            p={5}
            fontFamily="monospace"
            fontSize="sm"
            borderTopWidth="1px"
            borderColor="whiteAlpha.200"
            maxH="250px"
            overflowY="auto"
            css={{ "&::-webkit-scrollbar": { display: "none" } }}
          >
            <Text
              fontWeight="bold"
              color="whiteAlpha.500"
              mb={2}
              fontSize="xs"
              letterSpacing="wide"
            >
              TERMINAL OUTPUT:
            </Text>
            <Text whiteSpace="pre-wrap" lineHeight="1.6">
              {isRunning ? ">> Compiling and executing..." : output}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
