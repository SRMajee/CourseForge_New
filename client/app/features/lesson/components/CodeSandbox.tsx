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
import { FaPlay, FaTerminal, FaSave, FaCheck, FaCopy } from "react-icons/fa"; // 👈 Added FaCopy back
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
  const [copied, setCopied] = useState(false); // 👈 Track copy state

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

  // Inside CodeSandbox component...

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // ✅ Pass 'output' state here
      await CourseService.saveCode(lessonId, blockIndex, code, output);
      toaster.create({ title: "Code & Output Saved!", type: "success" });
    } catch (error) {
      toaster.create({ title: "Save Failed", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ NEW: Copy Handler
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.700"
      borderRadius="xl"
      overflow="hidden"
      my={6}
      bg="#1e1e1e"
      shadow="lg"
    >
      {/* Header */}
      <HStack
        bg="#2d2d2d"
        p={2}
        px={4}
        justify="space-between"
        borderBottomWidth="1px"
        borderColor="gray.700"
      >
        <HStack gap={3}>
          <Icon as={FaTerminal} color="green.400" />
          <Text
            fontSize="xs"
            fontWeight="bold"
            color="gray.300"
            textTransform="uppercase"
          >
            {language} Sandbox
          </Text>
        </HStack>

        {/* ✅ ACTION BUTTONS (Save & Copy) */}
        <HStack gap={1}>
          <Button
            size="xs"
            variant="ghost"
            color="gray.400"
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
            _hover={{ bg: "whiteAlpha.200" }}
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
            color="gray.100"
            fontFamily="'Fira Code', monospace"
            fontSize="sm"
            border="none"
            _focus={{ ring: "none" }}
            minH="150px"
            p={4}
            resize="vertical"
            spellCheck={false}
          />
          <Badge
            position="absolute"
            bottom={2}
            right={2}
            colorPalette="blue"
            size="sm"
            opacity={0.7}
          >
            Editable
          </Badge>
        </Box>

        {/* Action Bar */}
        <HStack
          bg="#252526"
          p={2}
          justify="flex-end"
          borderTopWidth="1px"
          borderColor="gray.700"
        >
          <Button
            size="sm"
            colorPalette="green"
            onClick={handleRun}
            loading={isRunning}
          >
            <FaPlay /> Run Code
          </Button>
        </HStack>

        {/* Output */}
        {(output || isRunning) && (
          <Box
            bg="black"
            color="green.300"
            p={4}
            fontFamily="monospace"
            fontSize="sm"
            borderTopWidth="1px"
            borderColor="gray.700"
            maxH="200px"
            overflowY="auto"
          >
            <Text fontWeight="bold" color="gray.500" mb={1} fontSize="xs">
              OUTPUT:
            </Text>
            <Text whiteSpace="pre-wrap">
              {isRunning ? ">> Running..." : output}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};
