import { useState, useRef, useEffect } from "react";
import {
  Box,
  Textarea,
  IconButton,
  HStack,
  Text,
  Badge,
  VStack,
  Switch,
  Icon,
} from "@chakra-ui/react";
import {
  FaArrowRight,
  FaMagic,
  FaGem,
  FaLock,
  FaCoins,
  FaExclamationCircle, // ✅ Added
} from "react-icons/fa";
import { useAuthStore } from "~/store/authStore";
import { useConfigStore } from "~/store/configStore";

interface HeroInputProps {
  onSubmit: (topic: string) => void;
  isLoading: boolean;
  mode: "standard" | "pro";
  onModeChange: (mode: "standard" | "pro") => void;
}

export const HeroInput = ({
  onSubmit,
  isLoading,
  mode,
  onModeChange,
}: HeroInputProps) => {
  const [topic, setTopic] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuthStore();
  const getCost = useConfigStore((state) => state.getCost);

  const isProUser =
    user?.planType === "PRO" || user?.subscriptionStatus === "active";
  const hasUsedTrial = user?.hasUsedProTrial;
  const canUsePro = isProUser || !hasUsedTrial;
  const isProMode = mode === "pro";

  // Cost Logic
  const COST = isProMode
    ? isProUser
      ? getCost("createCoursePro")
      : 0
    : getCost("createCourse");

  // ✅ Affordability Logic
  const credits = user?.credits || 0;
  const canAfford = credits >= COST;

  // Auto-grow logic
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [topic]);

  const handleSubmit = () => {
    if (!topic.trim()) return;
    onSubmit(topic);
  };

  return (
    <VStack w="full" maxW="3xl" gap={4} mx="auto" px={4} position="relative">
      {/* 1. Liquid Glow Backdrop */}
      <Box
        position="absolute"
        inset="-20px"
        bgGradient={
          isProMode
            ? "radial(circle, rgba(168,85,247,0.4) 0%, transparent 60%)"
            : "radial(circle, rgba(59,130,246,0.3) 0%, transparent 60%)"
        }
        filter="blur(40px)"
        opacity={0.6}
        zIndex={0}
        transition="all 0.6s ease"
        mixBlendMode="screen"
      />

      {/* 2. Glass Input Container */}
      <Box
        position="relative"
        zIndex={1}
        w="full"
        borderRadius="3xl"
        bg="rgba(255, 255, 255, 0.6)"
        _dark={{
          bg: "rgba(30, 30, 30, 0.6)",
          ringColor: "rgba(255, 255, 255, 0.1)",
        }}
        backdropFilter="blur(20px) saturate(180%)"
        shadow="xl"
        ring="1px"
        ringColor="rgba(255, 255, 255, 0.4)"
        transition="all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)"
        _focusWithin={{
          ringColor: !canAfford
            ? "red.400" // ✅ Red ring on error
            : isProMode
              ? "purple.400"
              : "blue.400",
          transform: "scale(1.005)",
          shadow: isProMode
            ? "0 15px 40px -10px rgba(168, 85, 247, 0.3)"
            : "0 15px 40px -10px rgba(59, 130, 246, 0.3)",
        }}
      >
        <HStack align="end" p={2} pr={2}>
          <Textarea
            ref={textareaRef}
            placeholder={
              isProMode
                ? "Describe a complex topic (e.g. 'Advanced System Design')..."
                : "What do you want to learn?"
            }
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={1}
            minH="52px"
            maxH="300px"
            overflow="hidden"
            fontSize="lg"
            fontWeight="medium"
            border="none"
            focusRing="none"
            _focusVisible={{ outline: "none", boxShadow: "none" }}
            _focus={{ boxShadow: "none", border: "none" }}
            p={4}
            resize="none"
            bg="transparent"
            _placeholder={{ color: "fg.muted", opacity: 0.8 }}
            css={{ "&::-webkit-scrollbar": { display: "none" } }}
          />

          <IconButton
            aria-label="Generate"
            colorPalette={!canAfford ? "red" : isProMode ? "purple" : "blue"}
            disabled={!topic.trim() || isLoading || !canAfford} // ✅ Disabled if broke
            onClick={handleSubmit}
            rounded="full"
            size="md"
            mb={1.5}
            mr={1}
            shadow="lg"
            transition="all 0.2s"
            _hover={{ transform: "scale(1.05)", shadow: "xl" }}
          >
            {isLoading ? (
              <FaMagic className="animate-spin" />
            ) : !canAfford ? (
              <FaExclamationCircle /> // ✅ Error Icon
            ) : (
              <FaArrowRight />
            )}
          </IconButton>
        </HStack>
      </Box>

      {/* 3. Controls */}
      <HStack w="full" justify="space-between" px={4} zIndex={1}>
        {/* Left: Switch */}
        <HStack
          gap={4}
          cursor={canUsePro ? "pointer" : "not-allowed"}
          opacity={!canUsePro && !isProMode ? 0.6 : 1}
        >
          <Switch.Root
            checked={isProMode}
            onCheckedChange={(e) =>
              canUsePro && onModeChange(e.checked ? "pro" : "standard")
            }
            colorPalette="purple"
            disabled={!canUsePro && !isProMode}
            size="md"
          >
            <Switch.HiddenInput />
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Switch.Label
              fontWeight="semibold"
              display="flex"
              alignItems="center"
              gap={2}
              fontSize="sm"
              color="fg.muted"
            >
              Pro Mode{" "}
              {isProMode && <Icon as={FaGem} color="purple.400" size="xs" />}
            </Switch.Label>
          </Switch.Root>
        </HStack>

        {/* Right: Cost & Status */}
        <HStack gap={3}>
          {/* Status Badge */}
          {!isProUser && !hasUsedTrial && isProMode && (
            <Badge
              colorPalette="green"
              variant="surface"
              size="sm"
              rounded="full"
              px={2}
              bg="green.500/10"
              borderColor="green.500/20"
              borderWidth="1px"
            >
              <FaMagic style={{ marginRight: 4 }} /> Free Trial Active
            </Badge>
          )}
          {!isProUser && hasUsedTrial && !isProMode && (
            <HStack color="fg.muted" fontSize="xs">
              <FaLock /> <Text>Upgrade for Pro</Text>
            </HStack>
          )}

          {/* ✅ Cost Badge / Error Badge */}
          {!canAfford ? (
            <Badge
              variant="solid"
              colorPalette="red"
              size="sm"
              rounded="full"
              px={3}
              bg="red.500"
              shadow="md"
            >
              <HStack gap={1}>
                <FaExclamationCircle size={12} />
                <Text fontWeight="bold">Not Enough Credits</Text>
              </HStack>
            </Badge>
          ) : (
            <Badge
              variant="surface"
              colorPalette={isProMode ? "purple" : "blue"}
              size="sm"
              rounded="full"
              px={3}
              bg={isProMode ? "purple.500/10" : "blue.500/10"}
              borderColor={isProMode ? "purple.500/20" : "blue.500/20"}
              borderWidth="1px"
            >
              <HStack gap={1}>
                <FaCoins size={10} />
                <Text>{COST} Credits</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
      </HStack>
    </VStack>
  );
};
