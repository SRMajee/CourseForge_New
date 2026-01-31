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
import { useConfigStore } from "~/store/configStore"; // 👈 Import Config Store

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const TopUpModal = ({ isOpen, onClose }: TopUpModalProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { config, isLoading: isConfigLoading } = useConfigStore(); // 👈 Get Config

  // Check Pro Status
  const isPro =
    user?.planType === "PRO" || user?.subscriptionStatus === "active";

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
        {/* --- OPTION 1: PRO SUBSCRIPTION (Hidden if already PRO) --- */}
        {!isPro && (
          <Card.Root
            variant="elevated"
            borderColor="purple.400"
            borderWidth="2px"
            overflow="hidden"
          >
            <Box
              bg="purple.600"
              color="white"
              px={4}
              py={1}
              fontSize="xs"
              fontWeight="bold"
              textAlign="center"
            >
              BEST VALUE • RECURRING
            </Box>
            <Card.Body p={5}>
              <HStack justify="space-between" align="start" mb={4}>
                <VStack align="start" gap={1}>
                  <HStack>
                    <Icon color="purple.500" fontSize="xl">
                      <FaCrown />
                    </Icon>
                    <Heading size="md">{config.pricing.pro.label}</Heading>
                  </HStack>
                  <Text fontSize="sm" color="fg.muted">
                    For serious learners
                  </Text>
                </VStack>
                <VStack align="end" gap={0}>
                  <Heading size="lg">₹{config.pricing.pro.price}</Heading>
                  <Text fontSize="xs" color="fg.muted">
                    / month
                  </Text>
                </VStack>
              </HStack>

              <VStack align="start" gap={2} mb={6}>
                <HStack>
                  <Icon color="green.500">
                    <FaCheck />
                  </Icon>
                  <Text fontSize="sm">
                    {config.pricing.pro.credits} Credits / mo
                  </Text>
                </HStack>
                <HStack>
                  <Icon color="green.500">
                    <FaCheck />
                  </Icon>
                  <Text fontSize="sm">Access to Deep Research</Text>
                </HStack>
                <HStack>
                  <Icon color="green.500">
                    <FaCheck />
                  </Icon>
                  <Text fontSize="sm">Priority Generation</Text>
                </HStack>
              </VStack>

              <Button
                w="full"
                colorPalette="purple"
                onClick={() => handleCheckout("", "pro_monthly")}
                loading={loadingId === "pro_monthly"}
              >
                Upgrade to Pro
              </Button>
            </Card.Body>
          </Card.Root>
        )}

        {/* Separator only needed if Pro option exists */}
        {!isPro && (
          <HStack>
            <Separator flex="1" />
            <Text fontSize="xs" color="fg.muted" fontWeight="bold">
              OR ONE-TIME TOP UP
            </Text>
            <Separator flex="1" />
          </HStack>
        )}

        {/* --- OPTION 2: ONE-TIME PACK --- */}
        <Card.Root variant="outline">
          <Card.Body p={4}>
            <HStack justify="space-between">
              <HStack gap={3}>
                <Box p={2} bg="yellow.100" rounded="full" color="yellow.600">
                  <FaCoins />
                </Box>
                <VStack align="start" gap={0}>
                  <Text fontWeight="bold">{config.pricing.topUp.label}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    {config.pricing.topUp.credits} Credits
                  </Text>
                </VStack>
              </HStack>

              <Button
                variant="outline"
                colorPalette="yellow"
                onClick={() => handleCheckout("top_up_small")}
                loading={loadingId === "top_up_small"}
              >
                Buy for ₹{config.pricing.topUp.price}
              </Button>
            </HStack>
          </Card.Body>
        </Card.Root>
      </VStack>
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose} size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>
              {isPro ? "Top Up Credits" : "Recharge & Upgrade"}
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb={6}>{renderContent()}</Dialog.Body>
          <Dialog.Footer>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
};
