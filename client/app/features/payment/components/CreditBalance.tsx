import { HStack, Text, Icon, Button, Box } from "@chakra-ui/react";
import { FaCoins, FaPlus } from "react-icons/fa";
import { useAuthStore } from "~/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { fireSuccessBurst } from "~/utils/confetti";

export const CreditBalance = ({ onOpenTopUp }: { onOpenTopUp: () => void }) => {
  const { user } = useAuthStore();
  const [prevCredits, setPrevCredits] = useState(user?.credits || 0);
  const [direction, setDirection] = useState(0); // 1 for gain, -1 for loss

  // Track changes to trigger animation
  useEffect(() => {
    if (user?.credits !== undefined) {
      if (user.credits > prevCredits) setDirection(1);
      if (user.credits < prevCredits) setDirection(-1);
      if (user.credits > prevCredits + 50) {
        fireSuccessBurst();
      }
      setPrevCredits(user.credits);
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
                color={
                  direction > 0
                    ? "green.500"
                    : direction < 0
                      ? "red.500"
                      : "inherit"
                }
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
