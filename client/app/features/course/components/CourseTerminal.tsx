import { useEffect, useState, useRef } from "react";
import {
  Box,
  Text,
  VStack,
  HStack,
  Progress,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { useSocketStore } from "~/store/socketStore";
import { useNavigate } from "react-router";
import { FaTerminal, FaExclamationTriangle } from "react-icons/fa";
import { fireSuccessBurst } from "~/utils/confetti";

interface CourseTerminalProps {
  jobId: string;
}

export const CourseTerminal = ({ jobId }: CourseTerminalProps) => {
  const { socket } = useSocketStore();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [logs, setLogs] = useState<string[]>([
    "Initializing connection to CourseForge Agent...",
  ]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"active" | "completed" | "failed">(
    "active",
  );

  useEffect(() => {
    if (!socket) return;

    const handleProgress = (data: any) => {
      if (data.jobId === jobId) {
        setLogs((prev) => [...prev, `> ${data.message}`]);
        setProgress(data.progress || 0);
      }
    };

    const handleComplete = (data: any) => {
      if (data.jobId === jobId) {
        setLogs((prev) => [...prev, `✅ SUCCESS: Course Generated.`]);
        setProgress(100);
        setStatus("completed");

        // ✅ 2. Fire Confetti HERE (When it's actually done)
        fireSuccessBurst();

        // Wait 1.5s then redirect
        setTimeout(() => {
          navigate(`/course/${data.result._id}`);
        }, 1500);
      }
    };

    const handleError = (data: any) => {
      if (data.jobId === jobId) {
        setLogs((prev) => [...prev, `❌ ERROR: ${data.message}`]);
        setStatus("failed");
      }
    };

    socket.on("job_progress", handleProgress);
    socket.on("job_complete", handleComplete);
    socket.on("job_error", handleError);

    return () => {
      socket.off("job_progress", handleProgress);
      socket.off("job_complete", handleComplete);
      socket.off("job_error", handleError);
    };
  }, [socket, jobId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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
    >
      <HStack
        justify="space-between"
        mb={4}
        borderBottomWidth="1px"
        borderColor="gray.800"
        pb={3}
      >
        <HStack>
          <Icon as={FaTerminal} />
          <Text fontWeight="bold">CourseForge Terminal</Text>
        </HStack>
        <Badge
          colorPalette={
            status === "failed"
              ? "red"
              : status === "completed"
                ? "green"
                : "blue"
          }
          variant="solid"
        >
          {status.toUpperCase()}
        </Badge>
      </HStack>

      <Box mb={6}>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="xs" color="gray.500">
            System Activity
          </Text>
          <Text fontSize="xs">{progress}%</Text>
        </HStack>
        <Progress.Root value={progress} size="xs" colorPalette="green" animated>
          <Progress.Track bg="gray.900">
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Box>

      <VStack
        align="start"
        h="300px"
        overflowY="auto"
        gap={1}
        fontSize="sm"
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
          <Text key={i} opacity={0.9} wordBreak="break-word">
            {log}
          </Text>
        ))}
        {status === "failed" && (
          <HStack color="red.400" mt={2}>
            <Icon as={FaExclamationTriangle} />
            <Text>Generation failed.</Text>
          </HStack>
        )}
        <div ref={bottomRef} />
      </VStack>
    </Box>
  );
};
