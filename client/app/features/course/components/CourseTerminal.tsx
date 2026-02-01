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
        fireSuccessBurst();
        setTimeout(() => navigate(`/course/${data.result._id}`), 1500);
      }
    };
    socket.on("job_progress", handleProgress);
    socket.on("job_complete", handleComplete);
    return () => {
      socket.off("job_progress", handleProgress);
      socket.off("job_complete", handleComplete);
    };
  }, [socket, jobId, navigate]);

  useEffect(
    () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    [logs],
  );

  return (
    <Box
      // ✅ DARK LIQUID GLASS TERMINAL
      bg="rgba(10, 10, 10, 0.85)"
      backdropFilter="blur(24px)"
      color="green.400"
      p={6}
      borderRadius="2xl"
      fontFamily="mono"
      shadow="2xl"
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      w="full"
      position="relative"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        // CRT Green Glow Effect
        boxShadow: "inset 0 0 40px rgba(72, 187, 120, 0.1)",
        borderRadius: "2xl",
      }}
    >
      <HStack
        justify="space-between"
        mb={4}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
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
          bg={status === "completed" ? "green.500/20" : "blue.500/20"}
          color={status === "completed" ? "green.300" : "blue.300"}
          borderWidth="1px"
          borderColor={status === "completed" ? "green.500/40" : "blue.500/40"}
        >
          {status.toUpperCase()}
        </Badge>
      </HStack>

      <Box mb={6}>
        <HStack justify="space-between" mb={1}>
          <Text fontSize="xs" color="whiteAlpha.600">
            System Activity
          </Text>
          <Text fontSize="xs">{progress}%</Text>
        </HStack>
        <Progress.Root value={progress} size="xs" colorPalette="green" animated>
          <Progress.Track bg="whiteAlpha.100">
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
        css={{ "&::-webkit-scrollbar": { display: "none" } }}
      >
        {logs.map((log, i) => (
          <Text key={i} opacity={0.9} wordBreak="break-word">
            {log}
          </Text>
        ))}
        <div ref={bottomRef} />
      </VStack>
    </Box>
  );
};
