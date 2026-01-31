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
  FaRedo,
} from "react-icons/fa";
import { toaster } from "~/components/ui/toaster";
import { api } from "~/services/api";
import { useAuthStore } from "~/store/authStore";
import { useConfigStore } from "~/store/configStore"; // 👈 Import Config Store

interface ManageSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubscriptionDetails {
  status: string;
  currentPeriodEnd: number;
  planName: string;
  cardLast4: string;
  cancelAtPeriodEnd: boolean;
}

export const ManageSubscriptionModal = ({
  isOpen,
  onClose,
}: ManageSubscriptionModalProps) => {
  const { user } = useAuthStore();
  const { config, isLoading: isConfigLoading } = useConfigStore(); // 👈 Get Config
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [step, setStep] = useState<"details" | "confirm">("details");
  const [subDetails, setSubDetails] = useState<SubscriptionDetails | null>(
    null,
  );

  const isPro =
    user?.planType === "PRO" || user?.subscriptionStatus === "active";

  useEffect(() => {
    if (isOpen && isPro) {
      fetchSubscriptionDetails();
      setStep("details"); // Reset step when opening
    }
  }, [isOpen, isPro]);

  const fetchSubscriptionDetails = async () => {
    setIsFetching(true);
    try {
      const { data } = await api.post("/subscription/portal", {
        returnUrl: window.location.href,
      });
      setSubDetails(data);
    } catch (error) {
      console.error("Failed to load subscription details", error);
      toaster.create({
        title: "Could not load subscription",
        description: "Please check your internet connection.",
        type: "error",
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.post("/subscription/portal");
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error) {
      toaster.create({
        title: "Failed to open billing portal",
        description: "Ensure Customer Portal is enabled in Stripe Dashboard.",
        type: "error",
      });
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      await api.post("/subscription/cancel");
      toaster.create({
        title: "Subscription Cancelled",
        description:
          "Your plan will remain active until the billing cycle ends.",
        type: "success",
      });
      // Optimistic Update
      if (subDetails) setSubDetails({ ...subDetails, cancelAtPeriodEnd: true });
      onClose();
    } catch (error) {
      toaster.create({ title: "Cancellation failed", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsLoading(true);
    try {
      await api.post("/subscription/resume");
      toaster.create({
        title: "Subscription Resumed",
        description: "Your plan will now renew automatically.",
        type: "success",
      });
      // Optimistic Update
      if (subDetails)
        setSubDetails({ ...subDetails, cancelAtPeriodEnd: false });
    } catch (error) {
      toaster.create({ title: "Resume failed", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const getFormattedDate = (timestamp?: number) => {
    if (!timestamp) return "Unknown Date";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderContent = () => {
    // 1. Not Pro
    if (!isPro) {
      return (
        <VStack py={8} gap={4}>
          <Icon as={FaExclamationTriangle} fontSize="3xl" color="orange.400" />
          <Text fontWeight="bold">No Active Subscription</Text>
          <Button colorPalette="blue" onClick={onClose}>
            View Plans
          </Button>
        </VStack>
      );
    }

    // 2. Loading Data (Wait for Subscription API AND Config)
    if (isFetching || isConfigLoading || !config) {
      return (
        <Center py={10}>
          <Spinner size="xl" color="blue.500" />
        </Center>
      );
    }

    // 3. Error
    if (!subDetails) {
      return (
        <VStack py={8} gap={2}>
          <Icon as={FaExclamationTriangle} fontSize="2xl" color="red.500" />
          <Text color="red.600">Failed to retrieve subscription details.</Text>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchSubscriptionDetails}
          >
            Retry
          </Button>
        </VStack>
      );
    }

    // 4. Confirmation View (Cancel Flow)
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
                  You will lose access to <strong>GPT-4 & DeepSeek</strong> on{" "}
                  <strong>
                    {getFormattedDate(subDetails.currentPeriodEnd)}
                  </strong>
                  .
                </Text>
              </Box>
            </HStack>
          </Box>
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

    // 5. Details View (Main)
    const isCancelled = subDetails.cancelAtPeriodEnd;

    return (
      <VStack align="stretch" gap={5}>
        <Card.Root
          variant="outline"
          bg={isCancelled ? "orange.50" : "blue.50"}
          borderColor={isCancelled ? "orange.200" : "blue.200"}
        >
          <Card.Body>
            <HStack justify="space-between" mb={2}>
              <HStack>
                <Icon
                  as={FaCrown}
                  color={isCancelled ? "orange.500" : "blue.500"}
                />
                <Text
                  fontWeight="bold"
                  color={isCancelled ? "orange.800" : "blue.800"}
                >
                  {subDetails.planName}
                </Text>
              </HStack>
              <Badge
                colorPalette={isCancelled ? "orange" : "green"}
                variant="solid"
              >
                {isCancelled ? "CANCELLING" : "ACTIVE"}
              </Badge>
            </HStack>
            <Text
              fontSize="2xl"
              fontWeight="bold"
              color={isCancelled ? "orange.900" : "blue.900"}
            >
              {/* 🟢 Dynamic Price from Config */}₹{config.pricing.pro.price}/mo
            </Text>
            <Text fontSize="sm" color={isCancelled ? "orange.700" : "blue.700"}>
              {isCancelled ? "Expires on: " : "Next billing date: "}
              {getFormattedDate(subDetails.currentPeriodEnd)}
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
        </VStack>

        <Separator />

        <VStack gap={3} w="full">
          {/* Update Card - Always visible */}
          <Button
            variant="ghost"
            size="sm"
            colorPalette="blue"
            w="full"
            justifyContent="space-between"
            onClick={handleUpdatePaymentMethod}
            loading={isLoading}
            disabled={isLoading}
            borderWidth="1px"
            borderColor="blue.200"
          >
            <HStack>
              <Icon as={FaCreditCard} color="fg.muted" />
              <Text>Update Payment Method (•••• {subDetails.cardLast4})</Text>
            </HStack>
            <Icon as={FaExternalLinkAlt} />
          </Button>

          {/* Dynamic Action Button: CANCEL vs RESUME */}
          {isCancelled ? (
            <Button
              colorPalette="green"
              size="sm"
              w="full"
              onClick={handleResumeSubscription}
              loading={isLoading}
            >
              <Icon as={FaRedo} mr={2} />
              Resume Subscription
            </Button>
          ) : (
            <Button
              variant="ghost"
              colorPalette="red"
              size="sm"
              w="full"
              justifyContent="flex-start"
              onClick={() => setStep("confirm")}
              disabled={isLoading}
            >
              Cancel Subscription
            </Button>
          )}
        </VStack>
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
