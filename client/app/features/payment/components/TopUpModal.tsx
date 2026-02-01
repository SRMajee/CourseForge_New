import {
  Dialog,
  Button,
  VStack,
  Text,
  HStack,
  Card,
  Icon,
  Box,
  Separator,
  Heading,
  Spinner,
  Center,
} from "@chakra-ui/react";
import { useState } from "react";
import { FaCoins, FaCrown, FaCheck } from "react-icons/fa";
import { api } from "~/services/api";
import { toaster } from "~/components/ui/toaster";
import { useAuthStore } from "~/store/authStore";
import { useConfigStore } from "~/store/configStore";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const TopUpModal = ({ isOpen, onClose }: TopUpModalProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { config, isLoading: isConfigLoading } = useConfigStore();

  const isPro =
    user?.planType === "PRO" || user?.subscriptionStatus === "active";
  // console.log("URL ", window.location.href);
  const handleCheckout = async (packId: string, planId?: string) => {
    setLoadingId(packId || planId || "loading");
    try {
      const { data } = await api.post("/payment/checkout", {
        packId,
        planId,
        returnUrl: window.location.href,
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toaster.create({ title: "Checkout Failed", type: "error" });
      setLoadingId(null);
    }
  };

  const renderContent = () => {
    if (isConfigLoading || !config) {
      return (
        <Center py={10}>
          <Spinner size="xl" color="blue.500" />
        </Center>
      );
    }

    return (
      <VStack gap={6} align="stretch">
        {/* --- OPTION 1: PRO SUBSCRIPTION (Glass Card) --- */}
        {!isPro && (
          <Box
            position="relative"
            overflow="hidden"
            borderRadius="2xl"
            borderWidth="1px"
            borderColor="purple.500/30"
            bg="purple.500/5"
            _dark={{ bg: "purple.500/10" }}
            backdropFilter="blur(10px)"
            transition="all 0.3s"
            _hover={{
              borderColor: "purple.400",
              boxShadow: "0 0 20px rgba(128, 90, 213, 0.15)",
              transform: "translateY(-2px)",
            }}
          >
            {/* Banner */}
            <Box
              bg="purple.600"
              color="white"
              px={4}
              py={1.5}
              fontSize="xs"
              fontWeight="bold"
              textAlign="center"
              letterSpacing="wider"
            >
              BEST VALUE • RECURRING
            </Box>

            <Box p={6}>
              <HStack justify="space-between" align="start" mb={6}>
                <VStack align="start" gap={1}>
                  <HStack>
                    <Icon color="purple.400" fontSize="xl">
                      <FaCrown />
                    </Icon>
                    <Heading size="lg" color="white">
                      {config.pricing.pro.label}
                    </Heading>
                  </HStack>
                  <Text fontSize="sm" color="gray.400">
                    For serious learners
                  </Text>
                </VStack>
                <VStack align="end" gap={0}>
                  <Heading size="xl" color="white">
                    ₹{config.pricing.pro.price}
                  </Heading>
                  <Text fontSize="xs" color="gray.500">
                    / month
                  </Text>
                </VStack>
              </HStack>

              <VStack align="start" gap={3} mb={8}>
                <HStack>
                  <Icon
                    color="green.400"
                    bg="green.400/10"
                    rounded="full"
                    p={1}
                  >
                    <FaCheck size={10} />
                  </Icon>
                  <Text fontSize="sm" color="gray.200">
                    <Text as="span" fontWeight="bold" color="white">
                      {config.pricing.pro.credits}
                    </Text>{" "}
                    Credits / mo
                  </Text>
                </HStack>
                <HStack>
                  <Icon
                    color="green.400"
                    bg="green.400/10"
                    rounded="full"
                    p={1}
                  >
                    <FaCheck size={10} />
                  </Icon>
                  <Text fontSize="sm" color="gray.200">
                    Access to Deep Research (GPT-4o)
                  </Text>
                </HStack>
                <HStack>
                  <Icon
                    color="green.400"
                    bg="green.400/10"
                    rounded="full"
                    p={1}
                  >
                    <FaCheck size={10} />
                  </Icon>
                  <Text fontSize="sm" color="gray.200">
                    Priority Generation Queue
                  </Text>
                </HStack>
              </VStack>

              <Button
                w="full"
                size="lg"
                colorPalette="purple"
                variant="solid"
                onClick={() => handleCheckout("", "pro_monthly")}
                loading={loadingId === "pro_monthly"}
                shadow="lg"
                _hover={{ transform: "translateY(-1px)", shadow: "xl" }}
              >
                Upgrade to Pro
              </Button>
            </Box>
          </Box>
        )}

        {/* Separator */}
        {!isPro && (
          <HStack opacity={0.6}>
            <Separator flex="1" borderColor="whiteAlpha.200" />
            <Text fontSize="xs" color="gray.400" fontWeight="bold" px={2}>
              OR ONE-TIME TOP UP
            </Text>
            <Separator flex="1" borderColor="whiteAlpha.200" />
          </HStack>
        )}

        {/* --- OPTION 2: ONE-TIME PACK (Glass Card) --- */}
        <Box
          p={5}
          borderRadius="2xl"
          bg="whiteAlpha.50"
          borderWidth="1px"
          borderColor="whiteAlpha.100"
          backdropFilter="blur(10px)"
          transition="all 0.2s"
          _hover={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.300" }}
        >
          <HStack justify="space-between">
            <HStack gap={4}>
              <Box
                p={3}
                bg="yellow.500/20"
                rounded="xl"
                color="yellow.400"
                borderWidth="1px"
                borderColor="yellow.500/30"
              >
                <FaCoins size={20} />
              </Box>
              <VStack align="start" gap={0.5}>
                <Text fontWeight="bold" fontSize="md" color="white">
                  {config.pricing.topUp.label}
                </Text>
                <Text fontSize="sm" color="gray.400">
                  {config.pricing.topUp.credits} Credits (Never expire)
                </Text>
              </VStack>
            </HStack>

            <Button
              variant="outline"
              colorPalette="yellow"
              size="md"
              rounded="xl"
              onClick={() => handleCheckout("top_up_small")}
              loading={loadingId === "top_up_small"}
              borderColor="yellow.500/50"
              _hover={{ bg: "yellow.500/10", borderColor: "yellow.400" }}
            >
              Buy for ₹{config.pricing.topUp.price}
            </Button>
          </HStack>
        </Box>
      </VStack>
    );
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={onClose}
      size="lg"
      placement="center"
    >
      <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(10px)" />
      <Dialog.Positioner>
        <Dialog.Content
          // ✅ LIQUID GLASS CONTAINER
          bg="rgba(20, 20, 20, 0.85)"
          _light={{ bg: "rgba(255, 255, 255, 0.85)" }}
          backdropFilter="blur(30px) saturate(180%)"
          borderRadius="3xl"
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          boxShadow="0 40px 80px -12px rgba(0, 0, 0, 0.6)"
          p={6}
        >
          <Dialog.Header mb={2}>
            <Dialog.Title fontSize="2xl" fontWeight="bold">
              {isPro ? "Top Up Credits" : "Recharge & Upgrade"}
            </Dialog.Title>
          </Dialog.Header>

          <Dialog.Body pb={2}>{renderContent()}</Dialog.Body>

          <Dialog.Footer>
            <Button
              variant="ghost"
              onClick={onClose}
              rounded="xl"
              color="gray.400"
              _hover={{ color: "white", bg: "whiteAlpha.100" }}
            >
              Cancel
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
