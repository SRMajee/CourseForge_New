import { HStack, Text, Icon, Button, Box } from "@chakra-ui/react";
import { FaCoins, FaPlus } from "react-icons/fa";
import { useAuthStore } from "~/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { fireSuccessBurst } from "~/utils/confetti";

export const CreditBalance = ({ onOpenTopUp }: { onOpenTopUp: () => void }) => {
  const { user } = useAuthStore();
  const [prevCredits, setPrevCredits] = useState(user?.credits || 0);

  // Controls the slide animation direction (1 = Up, -1 = Down)
  const [direction, setDirection] = useState(0);

  // Controls the text color ('green.500', 'red.500', or 'inherit')
  const [highlightColor, setHighlightColor] = useState("inherit");

  useEffect(() => {
    if (user?.credits !== undefined && user.credits !== prevCredits) {
      const isGain = user.credits > prevCredits;

      // 1. Set Direction for Animation
      setDirection(isGain ? 1 : -1);

      // 2. Set Flash Color
      setHighlightColor(isGain ? "green.500" : "red.500");

      // 3. Trigger Confetti for big wins
      if (user.credits > prevCredits + 50) {
        fireSuccessBurst();
      }

      // 4. Update Previous Value
      setPrevCredits(user.credits);

      // 5. Timer to reset color to white/inherit after 2 seconds
      const timer = setTimeout(() => {
        setHighlightColor("inherit"); // Reverts to default text color
      }, 2000);

      // Cleanup timer if credits change rapidly
      return () => clearTimeout(timer);
    }
  }, [user?.credits, prevCredits]);

  return (
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      key={`pill-${user?.credits}`}
      transition={{ duration: 0.2 }}
    >
      <HStack
        bg="bg.subtle"
        p={1}
        pl={4}
        borderRadius="full"
        borderWidth="1px"
        borderColor="border"
        gap={3}
      >
        <Icon color="yellow.500">
          <FaCoins />
        </Icon>

        {/* Animation Container */}
        <Box position="relative" h="24px" overflow="hidden" minW="30px">
          <AnimatePresence mode="popLayout" custom={direction}>
            <motion.div
              key={user?.credits}
              initial={{ y: direction > 0 ? -20 : 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: direction > 0 ? 20 : -20, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Text
                fontWeight="bold"
                // Uses the state that resets after 2 seconds
                color={highlightColor}
                // Adds a smooth color transition
                transition="color 0.5s ease"
              >
                {user?.credits || 0}
              </Text>
            </motion.div>
          </AnimatePresence>
        </Box>

        <Button
          size="xs"
          colorPalette="yellow"
          variant="solid"
          borderRadius="full"
          onClick={onOpenTopUp}
        >
          <FaPlus /> Top Up
        </Button>
      </HStack>
    </motion.div>
  );
};
