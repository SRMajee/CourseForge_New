import { useEffect, useState, useRef } from "react";
import { keyframes } from "@emotion/react";
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
import { FaCode, FaCheckCircle } from "react-icons/fa";
import { fireSuccessBurst } from "~/utils/confetti";
const joinedRegistry = new Set<string>();
// Animations
const popIn = keyframes`
  0% { opacity: 0; transform: scale(0.9) translateY(10px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

interface CourseTerminalProps {
  jobId: string;
}

export const CourseTerminal = ({ jobId }: CourseTerminalProps) => {
  const { socket, isConnected } = useSocketStore();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);
  const isCompletedRef = useRef(false); // ✅ Prevent double-firing/freezes

  const [logs, setLogs] = useState<string[]>(["Initializing neural uplink..."]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"active" | "completed" | "failed">(
    "active",
  );
  // ---------------------------------------------
  // 🛡️ THE FIX: Global Set Guard
  // ---------------------------------------------
  useEffect(() => {
    if (!socket || !jobId) return;

    // Unique Key for this specific socket connection + job combination
    const connectionKey = `${socket.id}:${jobId}`;

    // Only join if this socket hasn't joined this job yet
    if (!joinedRegistry.has(connectionKey)) {
      console.log(`🔌 [Safe Join] Joining Room: ${jobId}`);
      socket.emit("join_room", jobId);

      // Mark as joined globally
      joinedRegistry.add(connectionKey);
    }
  }, [socket, jobId]);
  // ---------------------------------------------
  // Debug: Log socket connection status
  useEffect(() => {
    if (socket) {
      console.log("🔌 Terminal Socket Attached:", socket.id);
    }
  }, [socket]);
  useEffect(() => {
    if (!socket) return;
    // ✅ DEBUG LISTENER: Catch ANY event
    socket.onAny((event, ...args) => {
      console.log(`📨 [Socket Event] ${event}`, args);
    });
    const handleStart = (data: any) => {
      if (data.jobId === jobId) {
        setLogs((prev) => [...prev, `🚀 ${data.message}`]);
        setProgress(1); // Force bar to move
      }
    };
    const handleProgress = (data: any) => {
      if (data.jobId === jobId && !isCompletedRef.current) {
        // Dedup logs if needed
        setLogs((prev) => {
          const lastLog = prev[prev.length - 1];
          return lastLog === data.message ? prev : [...prev, data.message];
        });
        setProgress(data.progress || 0);
      }
    };

    const handleComplete = (data: any) => {
      if (data.jobId === jobId && !isCompletedRef.current) {
        isCompletedRef.current = true; // ✅ Lock

        setLogs((prev) => [...prev, "Course Synthesis Complete."]);
        setProgress(100);
        setStatus("completed");
        fireSuccessBurst();
        setTimeout(() => {
          navigate(`/course/${data.result._id}`);
        }, 800);
      }
    };
    const handleError = (data: any) => {
      if (data.jobId === jobId) {
        isCompletedRef.current = true;
        setLogs((prev) => [...prev, `❌ ERROR: ${data.message}`]);
        setStatus("failed");
        setProgress(100);
      }
    };
    socket.on("course_generation_started", handleStart); // ✅ Listen for Start
    socket.on("job_progress", handleProgress);
    socket.on("job_complete", handleComplete);
    socket.on("course_generation_error", handleError);
    return () => {
      socket.off("course_generation_started", handleStart);
      socket.off("job_progress", handleProgress);
      socket.off("job_complete", handleComplete);
      socket.off("course_generation_error", handleError);
      socket.offAny();
    };
  }, [socket, jobId, navigate]);

  // Auto-scroll logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <Box
      // ✅ SMALLER, COMPACT TERMINAL
      bg="rgba(15, 23, 42, 0.95)"
      backdropFilter="blur(20px)"
      p={5}
      borderRadius="2xl"
      borderWidth="1px"
      borderColor="whiteAlpha.200"
      shadow="2xl"
      w="full"
      position="center"
      animation={`${popIn} 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)`}
    >
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack gap={3}>
          <Box
            p={1.5}
            bg={status === "completed" ? "green.500" : "blue.500"}
            rounded="md"
            color="white"
            shadow="lg"
          >
            <Icon
              as={status === "completed" ? FaCheckCircle : FaCode}
              fontSize="sm"
            />
          </Box>
          <VStack align="start" gap={0}>
            <Text fontWeight="bold" fontSize="sm" color="white">
              System Core
            </Text>
            {/* 📡 Connection Indicator */}
            {socket?.connected ? (
              <Badge colorPalette="green" size="xs">
                ONLINE
              </Badge>
            ) : (
              <Badge colorPalette="red" size="xs">
                OFFLINE
              </Badge>
            )}
            <Text fontSize="10px" color="gray.400" fontFamily="mono">
              PID: {jobId.slice(-6).toUpperCase()}
            </Text>
          </VStack>
        </HStack>
        <Badge
          colorPalette={status === "completed" ? "green" : "blue"}
          variant="solid"
          size="xs"
          px={2}
          rounded="full"
        >
          {status.toUpperCase()}
        </Badge>
      </HStack>

      {/* Progress Bar */}
      <Box mb={4}>
        <HStack justify="space-between" mb={1.5}>
          <Text
            fontSize="10px"
            fontWeight="semibold"
            color="gray.400"
            letterSpacing="wide"
          >
            COMPILING MODULES
          </Text>
          <Text fontSize="10px" fontWeight="bold" color="white">
            {progress}%
          </Text>
        </HStack>
        <Progress.Root
          value={progress}
          size="xs"
          colorPalette={status === "completed" ? "green" : "blue"}
          animated
        >
          <Progress.Track bg="whiteAlpha.100" rounded="full">
            <Progress.Range rounded="full" />
          </Progress.Track>
        </Progress.Root>
      </Box>

      {/* Logs Window (Smaller Height) */}
      <VStack
        align="start"
        h="160px" // ✅ Reduced height
        overflowY="auto"
        gap={1.5}
        fontSize="xs"
        fontFamily="mono"
        bg="blackAlpha.400"
        p={3}
        rounded="xl"
        borderWidth="1px"
        borderColor="whiteAlpha.100"
        css={{ "&::-webkit-scrollbar": { display: "none" } }}
      >
        {logs.map((log, i) => (
          <HStack key={i} align="start" gap={2} opacity={0.9}>
            <Text color="blue.400" fontSize="10px" mt={0.5}>
              {">"}
            </Text>
            <Text color="gray.300" wordBreak="break-word" lineHeight="short">
              {log}
            </Text>
          </HStack>
        ))}
        <div ref={bottomRef} />
      </VStack>
    </Box>
  );
};
