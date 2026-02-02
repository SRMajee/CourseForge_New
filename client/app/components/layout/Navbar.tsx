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
  Menu, // 👈 Add Menu imports
  Portal,
  Dialog,
  VStack,
  Icon,
} from "@chakra-ui/react";
import { useState } from "react";
import {
  FaBars,
  FaGem,
  FaCoins,
  FaPlus,
  FaSignOutAlt, // 👈 Add Icon
} from "react-icons/fa";
import { Link } from "react-router";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";
import { Tooltip } from "~/components/ui/tooltip";
import { TopUpModal } from "~/features/payment/components/TopUpModal";
import { useAuthStore } from "~/store/authStore";

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar = ({ onToggleSidebar }: NavbarProps) => {
  // ✅ Add logout to destructuring
  const {
    loginWithRedirect,
    logout,
    isAuthenticated,
    user: auth0User,
  } = useAuth0();
  const { user: dbUser } = useAuthStore();
  const [isTopUpOpen, setTopUpOpen] = useState(false);

  // ✅ Logout Modal State
  const [isLogoutOpen, setLogoutOpen] = useState(false);

  const user = dbUser ? { ...auth0User, ...dbUser } : auth0User;
  const isPro =
    dbUser?.planType === "PRO" || dbUser?.subscriptionStatus === "active";
  const credits = dbUser?.credits || 0;

  const handleLogout = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  return (
    <>
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        px={6}
        py={4}
        // ✅ "APPLE LIQUID GLASS" HEADER
        bg="rgba(255, 255, 255, 0.05)"
        _dark={{
          bg: "rgba(0, 0, 0, 0.05)",
          borderBottomColor: "rgba(255, 255, 255, 0.05)",
        }}
        backdropFilter="blur(24px) saturate(180%)"
        borderBottomWidth="1px"
        borderBottomColor="rgba(255, 255, 255, 0.1)"
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
            <Link to="/">
              <Heading
                size="md"
                fontWeight="bold"
                letterSpacing="tight"
                opacity={0.9}
                cursor="pointer"
                transition="opacity 0.2s"
                _hover={{ opacity: 1 }}
              >
                Course
                <Text as="span" color="blue.500">
                  Forge
                </Text>
              </Heading>
            </Link>
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
              {/* Credits Display */}
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

              {/* ✅ Profile Avatar with Dropdown Menu */}
              <HStack
                gap={0}
                bg="whiteAlpha.50"
                _hover={{ bg: "whiteAlpha.200", shadow: "lg" }}
                transition="all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)"
                rounded="full"
                p={1}
                pr={1}
                className="group"
                cursor="default"
                borderWidth="1px"
                borderColor="transparent"
                _dark={{ _hover: { borderColor: "whiteAlpha.100" } }}
              >
                {/* HIDDEN LOGOUT BUTTON (Reveals on Hover) */}
                <Box
                  maxW="0px"
                  overflow="hidden"
                  whiteSpace="nowrap"
                  transition="all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)"
                  opacity={0}
                  _groupHover={{ maxW: "100px", opacity: 1, mr: 2 }}
                >
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    rounded="full"
                    onClick={() => setLogoutOpen(true)}
                    px={3}
                    h="28px"
                    _hover={{ bg: "red.500/10" }}
                  >
                    <Icon as={FaSignOutAlt} mr={1.5} />
                    Log Out
                  </Button>
                </Box>
                {/* AVATAR (Always Visible) */}
                <Tooltip
                  content={user.name}
                  showArrow
                  positioning={{ placement: "bottom-end" }} // ✅ Fix: Anchor to right
                >
                  <Box>
                    {" "}
                    {/* ✅ Fix: Stable wrapper for positioning */}
                    <Avatar.Root
                      size="xs"
                      ring={isPro ? "2px" : "1px"}
                      ringColor={isPro ? "purple.500/50" : "whiteAlpha.300"}
                      transition="transform 0.3s ease"
                      _groupHover={{ scale: "1.05", ringColor: "blue.400" }}
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
      </Flex>

      <TopUpModal isOpen={isTopUpOpen} onClose={() => setTopUpOpen(false)} />

      {/* ✅ LIQUID GLASS LOGOUT MODAL */}
      <Dialog.Root
        open={isLogoutOpen}
        onOpenChange={(e) => setLogoutOpen(e.open)}
        placement="center"
      >
        <Dialog.Backdrop bg="blackAlpha.700" backdropFilter="blur(10px)" />
        <Dialog.Positioner>
          <Dialog.Content
            bg="rgba(20, 20, 20, 0.8)"
            _light={{ bg: "rgba(255, 255, 255, 0.8)" }}
            backdropFilter="blur(24px) saturate(180%)"
            borderRadius="3xl"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            boxShadow="0 20px 50px rgba(0,0,0,0.5)"
            p={8}
            textAlign="center"
          >
            <VStack gap={6}>
              <Box
                p={4}
                bg="red.500/20"
                rounded="full"
                color="red.400"
                fontSize="2xl"
                boxShadow="0 0 20px rgba(245, 101, 101, 0.3)"
              >
                <Icon as={FaSignOutAlt} />
              </Box>
              <Box>
                <Heading size="xl" mb={2}>
                  Log Out?
                </Heading>
                <Text color="fg.muted" maxW="xs" mx="auto">
                  Are you sure you want to sign out of your account?
                </Text>
              </Box>
              <HStack w="full" gap={3} pt={2}>
                <Button
                  variant="ghost"
                  flex={1}
                  onClick={() => setLogoutOpen(false)}
                  rounded="xl"
                  h="12"
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  flex={1}
                  onClick={handleLogout}
                  rounded="xl"
                  h="12"
                  shadow="lg"
                  _hover={{ transform: "translateY(-2px)", shadow: "xl" }}
                >
                  Confirm Logout
                </Button>
              </HStack>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
};
