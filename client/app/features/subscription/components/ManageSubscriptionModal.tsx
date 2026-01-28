import {
  Dialog,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Icon,
  Box,
  Separator,
  Card,
  Spinner,
  Center,
  Portal,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import {
  FaCrown,
  FaCreditCard,
  FaExclamationTriangle,
  FaCheckCircle,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/services/api";
import { useAuthStore } from "~/store/authStore";

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubscriptionDetails {
  status: string;
  currentPeriodEnd: number; // Unix timestamp
  planName: string;
  cardLast4: string;
  cancelAtPeriodEnd: boolean;
}

export const ManageSubscriptionModal = ({
  isOpen,
  onClose,
}: ManageSubscriptionModalProps) => {
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(
    null,
  );

  const isPro =
    user?.planType === "PRO" || user?.subscriptionStatus === "active";

  // 1. Fetch Subscription Details on Open
  useEffect(() => {
    if (isOpen && isPro) {
      fetchSubscriptionDetails();
    }
  }, [isOpen, isPro]);

  const fetchSubscriptionDetails = async () => {
    setIsFetching(true);
    try {
      // Expecting backend to return: { status, currentPeriodEnd, cardLast4, ... }
      const { data } = await api.get("/subscription/current");
      setSubDetails(data);
    } catch (error) {
      console.error("Failed to load subscription details", error);
    } finally {
      setIsFetching(false);
    }
  };

  // 2. Handle "Update Card" -> Redirect to Stripe Portal
  const handleUpdatePaymentMethod = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/subscription/portal");
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      toaster.create({
        title: "Failed to open billing portal",
        type: "error",
      });
      setIsLoading(false);
    }
  };

  // 3. Handle Cancellation
  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      await api.post("/subscription/cancel");

      toaster.create({
        title: "Subscription Cancelled",
        description:
          "Your plan will remain active until the end of the billing cycle.",
        type: "success",
      });

      // Optimistic Update
      if (user) {
        setUser({ ...user, subscriptionStatus: "canceled" });
      }
      if (subDetails) {
        setSubDetails({ ...subDetails, cancelAtPeriodEnd: true });
      }
      onClose();
    } catch (error) {
      console.error(error);
      toaster.create({ title: "Cancellation failed", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const getFormattedDate = (timestamp?: number) => {
    if (!timestamp) return "Loading...";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderContent = () => {
    if (!isPro) {
      return (
        <VStack py={8} gap={4}>
          <Icon as={FaExclamationTriangle} fontSize="3xl" color="orange.400" />
          <Text fontWeight="bold">No Active Subscription</Text>
          <Text color="fg.muted" textAlign="center">
            You are currently on the Free plan. Upgrade to Pro to unlock
            advanced features.
          </Text>
          <Button colorPalette="blue" onClick={onClose}>
            View Plans
          </Button>
        </VStack>
      );
    }

    if (isFetching && !subDetails) {
      return (
        <Center py={10}>
          <Spinner size="xl" color="blue.500" />
        </Center>
      );
    }

    if (step === "confirm") {
      return (
        <VStack gap={4} py={2}>
          <Box
            bg="red.50"
            p={4}
            borderRadius="md"
            borderLeftWidth="4px"
            borderColor="red.500"
            w="full"
          >
            <HStack align="start">
              <Icon as={FaExclamationTriangle} color="red.500" mt={1} />
              <Box>
                <Text fontWeight="bold" color="red.800">
                  Are you sure?
                </Text>
                <Text fontSize="sm" color="red.700" mt={1}>
                  You will lose access to <strong>GPT-4 & DeepSeek</strong>{" "}
                  generation on{" "}
                  <strong>
                    {getFormattedDate(subDetails?.currentPeriodEnd)}
                  </strong>
                  .
                </Text>
              </Box>
            </HStack>
          </Box>

          <Text fontSize="sm" color="fg.muted">
            This action cannot be undone immediately. You may need to
            resubscribe manually.
          </Text>

          <HStack w="full" gap={3} mt={2}>
            <Button
              variant="outline"
              flex="1"
              onClick={() => setStep("details")}
              disabled={isLoading}
            >
              Keep Pro
            </Button>
            <Button
              colorPalette="red"
              flex="1"
              onClick={handleCancelSubscription}
              loading={isLoading}
            >
              Confirm Cancellation
            </Button>
          </HStack>
        </VStack>
      );
    }

    // Default: Details View
    return (
      <VStack align="stretch" gap={5}>
        {/* Plan Card */}
        <Card.Root variant="outline" bg="blue.50" borderColor="blue.200">
          <Card.Body>
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Icon as={FaCrown} color="blue.500" />
                <Text fontWeight="bold" color="blue.800">
                  {subDetails?.planName || "Pro Plan"}
                </Text>
              </HStack>
              <Badge
                colorPalette={
                  subDetails?.cancelAtPeriodEnd ? "orange" : "green"
                }
                variant="solid"
              >
                {subDetails?.cancelAtPeriodEnd ? "CANCELLING" : "ACTIVE"}
              </Badge>
            </HStack>
            <Text fontSize="2xl" fontWeight="bold" color="blue.900">
              $19/mo
            </Text>
            <Text fontSize="sm" color="blue.700">
              {subDetails?.cancelAtPeriodEnd
                ? "Expires on: "
                : "Next billing date: "}
              {getFormattedDate(subDetails?.currentPeriodEnd)}
            </Text>
          </Card.Body>
        </Card.Root>

        <VStack align="start" gap={3}>
          <Text fontWeight="bold" fontSize="sm">
            Included Features:
          </Text>
          <HStack>
            <Icon as={FaCheckCircle} color="green.500" />
            <Text fontSize="sm">Unlimited Course Generation</Text>
          </HStack>
          <HStack>
            <Icon as={FaCheckCircle} color="green.500" />
            <Text fontSize="sm">Access to DeepSeek & GPT-4</Text>
          </HStack>
          <HStack>
            <Icon as={FaCheckCircle} color="green.500" />
            <Text fontSize="sm">Priority Support</Text>
          </HStack>
        </VStack>

        <Separator />

        <HStack justify="space-between">
          <HStack>
            <Icon as={FaCreditCard} color="fg.muted" />
            <Text fontSize="sm">•••• {subDetails?.cardLast4 || "••••"}</Text>
          </HStack>
          <Button
            variant="ghost"
            size="sm"
            colorPalette="blue"
            onClick={handleUpdatePaymentMethod}
            loading={isLoading}
          >
            Update Card <Icon as={FaExternalLinkAlt} ml={1} />
          </Button>
        </HStack>

        <Separator />

        {!subDetails?.cancelAtPeriodEnd && (
          <Box pt={2}>
            <Button
              variant="ghost"
              colorPalette="red"
              size="sm"
              w="full"
              justifyContent="flex-start"
              onClick={() => setStep("confirm")}
            >
              Cancel Subscription
            </Button>
          </Box>
        )}
      </VStack>
    );
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e) => onClose()}
      placement="center"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Manage Subscription</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>{renderContent()}</Dialog.Body>
            <Dialog.CloseTrigger />
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
