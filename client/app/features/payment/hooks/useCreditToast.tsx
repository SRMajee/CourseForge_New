// features/payment/hooks/useCreditToast.tsx
import { toaster } from "~/components/ui/toaster"; // Import from your UI snippets
import { Box, VStack, HStack, Text, Button, Icon } from "@chakra-ui/react";
import { FaLock } from "react-icons/fa";

export const useCreditToast = () => {
  const showInsufficientCredits = (onOpenTopUp: () => void) => {
    // In v3, we use toaster.create()
    toaster.create({
      title: "Insufficient Credits",
      description: "You don't have enough credits to generate this lesson.",
      type: "error", // Or "warning"
      duration: 5000,
      // Custom rendering in v3 uses 'render' or custom components
      // For a simple version with an action button:
      action: {
        label: "Top Up",
        onClick: () => onOpenTopUp(),
      },
    });
  };

  return { showInsufficientCredits };
};
