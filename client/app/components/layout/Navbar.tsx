import { useAuth0 } from "@auth0/auth0-react";
import {
  Button,
  HStack,
  Avatar,
  Text,
  Flex,
  IconButton,
  Heading,
  VStack,
  Box,
  Badge,
} from "@chakra-ui/react";
import { useState } from "react";
import { FaBars, FaGem } from "react-icons/fa";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";
import { Tooltip } from "~/components/ui/tooltip";
import { CreditBalance } from "~/features/payment/components/CreditBalance";
import { TopUpModal } from "~/features/payment/components/TopUpModal";
import { useSocketCredits } from "~/hooks/useSocketCredits";
import { useAuthStore } from "~/store/authStore";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user: auth0User,
  } = useAuth0();
  const { user: dbUser } = useAuthStore();
  const [isTopUpOpen, setTopUpOpen] = useState(false);
  const user = dbUser || auth0User;

  // ✅ Check Pro Status safely
  const isPro =
    dbUser?.planType === "PRO" || dbUser?.subscriptionStatus === "active";

  return (
    <Flex
      as="nav"
      align="center"
      justify="space-between"
      wrap="wrap"
      padding="1rem"
      bg="bg.panel"
      borderBottomWidth="1px"
      borderColor="border"
      position="sticky"
      top="0"
      zIndex="sticky"
    >
      <HStack gap={3}>
        <IconButton
          aria-label="Open Menu"
          variant="ghost"
          onClick={onToggleSidebar}
        >
          <FaBars />
        </IconButton>

        <HStack align="center" gap={2}>
          <Heading size="md" color="blue.600">
            CourseForge
          </Heading>
          {/* ✅ GEMINI-STYLE BADGE */}
          {isAuthenticated && (
            <Badge
              variant="solid"
              colorPalette={isPro ? "purple" : "gray"}
              size="sm"
            >
              {isPro ? (
                <>
                  <FaGem /> PRO
                </>
              ) : (
                "FREE"
              )}
            </Badge>
          )}
        </HStack>
      </HStack>

      <HStack gap={4}>
        <ColorModeSwitcher />

        {isAuthenticated && user ? (
          <>
            <CreditBalance onOpenTopUp={() => setTopUpOpen(true)} />

            <HStack gap={3}>
              <Tooltip
                positioning={{ placement: "bottom-end" }}
                content={
                  <VStack gap={0} align="start" p={2}>
                    <Text fontWeight="bold" fontSize="sm">
                      {user.name}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {user.email}
                    </Text>
                    {/* ✅ Plan Status in Tooltip */}
                    <Badge
                      mt={1}
                      size="xs"
                      colorPalette={isPro ? "purple" : "blue"}
                    >
                      {isPro ? "Pro Plan Active" : "Free Plan"}
                    </Badge>
                  </VStack>
                }
                openDelay={200}
                closeDelay={100}
                showArrow
              >
                <Box display="inline-block" cursor="pointer">
                  <Avatar.Root
                    size="sm"
                    ring={isPro ? "2px" : "0px"}
                    ringColor="purple.400"
                  >
                    <Avatar.Fallback>
                      {user.name?.substring(0, 2).toUpperCase()}
                    </Avatar.Fallback>
                    <Avatar.Image src={user.picture} />
                  </Avatar.Root>
                </Box>
              </Tooltip>
            </HStack>

            <Button
              size="sm"
              variant="ghost"
              colorPalette="gray"
              onClick={() =>
                logout({ logoutParams: { returnTo: window.location.origin } })
              }
            >
              Log Out
            </Button>
          </>
        ) : (
          <Button
            onClick={() => loginWithRedirect()}
            colorPalette="blue"
            size="sm"
          >
            Log In
          </Button>
        )}
      </HStack>

      <TopUpModal isOpen={isTopUpOpen} onClose={() => setTopUpOpen(false)} />
    </Flex>
  );
};
