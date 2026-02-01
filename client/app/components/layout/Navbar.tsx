import { useAuth0 } from "@auth0/auth0-react";
import {
  Button,
  HStack,
  Avatar,
  Text,
  Flex,
  IconButton,
  Heading,
  Box,
  Badge,
} from "@chakra-ui/react";
import { useState } from "react";
import { FaBars, FaGem, FaCoins, FaPlus } from "react-icons/fa";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";
import { Tooltip } from "~/components/ui/tooltip";
import { CreditBalance } from "~/features/payment/components/CreditBalance";
import { TopUpModal } from "~/features/payment/components/TopUpModal";
import { useAuthStore } from "~/store/authStore";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const { loginWithRedirect, isAuthenticated, user: auth0User } = useAuth0();
  const { user: dbUser } = useAuthStore();
  const [isTopUpOpen, setTopUpOpen] = useState(false);

  const user = dbUser ? { ...auth0User, ...dbUser } : auth0User;
  const isPro =
    dbUser?.planType === "PRO" || dbUser?.subscriptionStatus === "active";
  const credits = dbUser?.credits || 0;

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      px={6}
      py={4}
      // ✅ "APPLE LIQUID GLASS" HEADER
      bg="rgba(255, 255, 255, 0.05)" // Ultra transparent
      _dark={{
        bg: "rgba(0, 0, 0, 0.05)",
        borderBottomColor: "rgba(255, 255, 255, 0.05)",
      }}
      backdropFilter="blur(24px) saturate(180%)" // High blur + Saturation
      borderBottomWidth="1px"
      borderBottomColor="rgba(255, 255, 255, 0.1)" // Subtle edge light
      transition="all 0.3s ease"
      position="sticky"
      top="0"
      zIndex="1000"
    >
      {/* Branding */}
      <HStack gap={4}>
        <IconButton
          aria-label="Menu"
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          color="fg.muted"
          _hover={{ bg: "whiteAlpha.200" }}
          rounded="full"
        >
          <FaBars />
        </IconButton>
        <HStack align="center" gap={2}>
          <Heading
            size="md"
            fontWeight="bold"
            letterSpacing="tight"
            opacity={0.9}
          >
            Course
            <Text as="span" color="blue.500">
              Forge
            </Text>
          </Heading>
          {isAuthenticated && (
            <Badge
              variant="surface"
              colorPalette={isPro ? "purple" : "gray"}
              size="xs"
              px={2}
              rounded="full"
              bg={isPro ? "purple.500/10" : "gray.500/10"}
              color={isPro ? "purple.400" : "gray.400"}
              borderWidth="1px"
              borderColor={isPro ? "purple.500/20" : "gray.500/20"}
            >
              {isPro ? (
                <HStack gap={1}>
                  <FaGem size={8} />
                  <Text>PRO</Text>
                </HStack>
              ) : (
                "FREE"
              )}
            </Badge>
          )}
        </HStack>
      </HStack>

      {/* Actions */}
      <HStack gap={4}>
        <ColorModeSwitcher />

        {isAuthenticated && user ? (
          <>
            {/* ✅ DYNAMIC CREDITS DISPLAY */}
            <Tooltip
              content={isPro ? "Pro Credits Available" : "Free Credits"}
              showArrow
              positioning={{ placement: "bottom" }}
            >
              <Button
                variant="ghost"
                size="sm"
                rounded="full"
                h="32px"
                // Pro = Purple, Free = Blue
                bg={isPro ? "purple.500/10" : "blue.500/10"}
                color={isPro ? "purple.300" : "blue.300"}
                borderWidth="1px"
                borderColor={isPro ? "purple.500/20" : "blue.500/20"}
                _hover={{
                  bg: isPro ? "purple.500/20" : "blue.500/20",
                  transform: "translateY(-1px)",
                }}
                onClick={() => setTopUpOpen(true)}
              >
                <HStack gap={2}>
                  <FaCoins size={12} />
                  <Text fontWeight="bold" fontSize="xs">
                    {credits}
                  </Text>
                  <Box
                    w="1px"
                    h="12px"
                    bg={isPro ? "purple.500/30" : "blue.500/30"}
                  />
                  <FaPlus size={8} opacity={0.7} />
                </HStack>
              </Button>
            </Tooltip>

            {/* Profile Avatar */}
            <HStack gap={3}>
              <Tooltip content={user.name} showArrow>
                <Box cursor="pointer">
                  <Avatar.Root
                    size="xs"
                    ring={isPro ? "2px" : "1px"}
                    ringColor={isPro ? "purple.500/50" : "whiteAlpha.300"}
                    transition="all 0.2s"
                    _hover={{ ringColor: "blue.400" }}
                  >
                    <Avatar.Image src={user.picture} />
                    <Avatar.Fallback>{user.name?.[0]}</Avatar.Fallback>
                  </Avatar.Root>
                </Box>
              </Tooltip>
            </HStack>
          </>
        ) : (
          <Button
            onClick={() => loginWithRedirect()}
            colorPalette="blue"
            size="xs"
            rounded="full"
            px={6}
          >
            Log In
          </Button>
        )}
      </HStack>
      <TopUpModal isOpen={isTopUpOpen} onClose={() => setTopUpOpen(false)} />
    </Flex>
  );
};
