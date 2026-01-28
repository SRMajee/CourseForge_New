import {
  Dialog,
  Button,
  VStack,
  Text,
  HStack,
  Card,
  Badge,
  Icon,
  Box,
  Separator,
  Heading,
} from "@chakra-ui/react";
import { useState } from "react";
import { FaCoins, FaCrown, FaCheck } from "react-icons/fa";
import { api } from "~/services/api"; // Your Axios instance
import { toaster } from "~/components/ui/toaster";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TopUpModal = ({ isOpen, onClose }: TopUpModalProps) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Match these IDs with your Backend 'stripe.ts' config
  const handleCheckout = async (packId: string, planId?: string) => {
    setLoadingId(packId || planId || "loading");
    try {
      // Call Backend to get Stripe URL
      const { data } = await api.post("/payment/checkout", {
        packId,
        planId,
      });

      // Redirect to Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error(error);
      toaster.create({ title: "Checkout Failed", type: "error" });
      setLoadingId(null);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose} size="lg">
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Recharge & Upgrade</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body pb={6}>
            <VStack gap={6} align="stretch">
              {/* --- OPTION 1: PRO SUBSCRIPTION --- */}
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
                        <Heading size="md">Pro Monthly</Heading>
                      </HStack>
                      <Text fontSize="sm" color="fg.muted">
                        For serious learners
                      </Text>
                    </VStack>
                    <VStack align="end" gap={0}>
                      <Heading size="lg">$12</Heading>
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
                      <Text fontSize="sm">1,000 Credits / mo</Text>
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

              <HStack>
                <Separator flex="1" />
                <Text fontSize="xs" color="fg.muted" fontWeight="bold">
                  OR ONE-TIME TOP UP
                </Text>
                <Separator flex="1" />
              </HStack>

              {/* --- OPTION 2: ONE-TIME PACK --- */}
              <Card.Root variant="outline">
                <Card.Body p={4}>
                  <HStack justify="space-between">
                    <HStack gap={3}>
                      <Box
                        p={2}
                        bg="yellow.100"
                        rounded="full"
                        color="yellow.600"
                      >
                        <FaCoins />
                      </Box>
                      <VStack align="start" gap={0}>
                        <Text fontWeight="bold">Small Pack</Text>
                        <Text fontSize="xs" color="fg.muted">
                          300 Credits
                        </Text>
                      </VStack>
                    </HStack>

                    <Button
                      variant="outline"
                      colorPalette="yellow"
                      onClick={() => handleCheckout("top_up_small")}
                      loading={loadingId === "top_up_small"}
                    >
                      Buy for $5
                    </Button>
                  </HStack>
                </Card.Body>
              </Card.Root>
            </VStack>
          </Dialog.Body>
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
