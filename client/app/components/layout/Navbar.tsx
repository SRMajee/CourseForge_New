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
  Menu,
  Dialog,
  VStack,
  Icon,
  Portal, // ✅ Imported Portal for safe rendering
} from "@chakra-ui/react";
import { useState } from "react";
import { FaBars, FaGem, FaCoins, FaPlus, FaSignOutAlt } from "react-icons/fa";
import { Link } from "react-router";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";
import { Tooltip } from "~/components/ui/tooltip";
import { TopUpModal } from "~/features/payment/components/TopUpModal";
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
        wrap="nowrap" // ✅ Strict no-wrap
        px={{ base: 4, md: 6 }}
        py={4}
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
        <HStack gap={{ base: 2, md: 4 }} flexShrink={0}>
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
                size={{ base: "sm", md: "md" }}
                fontWeight="bold"
                letterSpacing="tight"
                opacity={0.9}
                cursor="pointer"
                transition="opacity 0.2s"
                _hover={{ opacity: 1 }}
                whiteSpace="nowrap"
              >
                Course
                <Text as="span" color="blue.500">
                  Forge
                </Text>
              </Heading>
            </Link>
            {isAuthenticated && (
              <Badge
                display={{ base: "none", sm: "flex" }}
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
        <HStack gap={{ base: 2, md: 4 }} flexShrink={0}>
          <ColorModeSwitcher />

          {isAuthenticated && user ? (
            <>
              {/* Credits Button (Simplified for Mobile) */}
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
                  px={{ base: 1.5, md: 3 }}
                  bg={{
                    base: "transparent",
                    md: isPro ? "purple.500/10" : "blue.500/10",
                  }} // ✅ Transparent on mobile
                  color={isPro ? "purple.300" : "blue.300"}
                  borderWidth={{ base: "0px", md: "1px" }} // ✅ No border on mobile
                  borderColor={isPro ? "purple.500/20" : "blue.500/20"}
                  _hover={{
                    bg: isPro ? "purple.500/20" : "blue.500/20",
                    transform: "translateY(-1px)",
                  }}
                  onClick={() => setTopUpOpen(true)}
                >
                  <HStack gap={2.5}>
                    <FaCoins size={14} /> {/* Slightly larger icon on mobile */}
                    {/* ✅ Desktop: Show Count */}
                    <Text fontWeight="bold" fontSize="xs" display="block">
                      {credits}
                    </Text>
                    {/* ✅ Desktop: Show Divider */}
                    <Box
                      w="1px"
                      h="12px"
                      bg={isPro ? "purple.500/30" : "blue.500/30"}
                      display="block"
                    />
                    <FaPlus size={10} opacity={0.7} />
                  </HStack>
                </Button>
              </Tooltip>

              {/* =============================================
                  DESKTOP VIEW: Sliding Hover Effect
              ============================================= */}
              <Box display={{ base: "none", md: "block" }}>
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
                  <Tooltip
                    content={user.name}
                    showArrow
                    positioning={{ placement: "bottom-end" }}
                  >
                    <Box>
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
              </Box>

              {/* =============================================
                  MOBILE VIEW: Clickable Menu with Portal
              ============================================= */}
              <Box display={{ base: "block", md: "none" }}>
                <Menu.Root
                  positioning={{ placement: "bottom-end", gutter: 10 }}
                >
                  <Menu.Trigger asChild>
                    <Box cursor="pointer" p={1}>
                      {" "}
                      {/* Added padding for touch target */}
                      <Avatar.Root
                        size="xs"
                        ring={isPro ? "2px" : "1px"}
                        ringColor={isPro ? "purple.500/50" : "whiteAlpha.300"}
                        transition="transform 0.3s ease"
                        _hover={{ scale: "1.05", ringColor: "blue.400" }}
                      >
                        <Avatar.Image src={user.picture} />
                        <Avatar.Fallback>{user.name?.[0]}</Avatar.Fallback>
                      </Avatar.Root>
                    </Box>
                  </Menu.Trigger>

                  {/* ✅ PORTAL: Renders outside the Navbar DOM to prevent layout breaking */}
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content
                        minW="220px" // Slightly wider for credits
                        bg="rgba(20, 20, 20, 0.95)"
                        _light={{ bg: "rgba(255, 255, 255, 0.95)" }}
                        backdropFilter="blur(20px)"
                        borderRadius="2xl"
                        borderWidth="1px"
                        borderColor="whiteAlpha.200"
                        shadow="2xl"
                        p={2}
                        zIndex={1500} // Ensure it's above everything
                      >
                        {/* Mobile User Info & Credits */}
                        <Box
                          bg="whiteAlpha.50"
                          rounded="xl"
                          p={3}
                          mb={2}
                          borderWidth="1px"
                          borderColor="whiteAlpha.100"
                        >
                          <HStack mb={2} gap={3}>
                            <Avatar.Root
                              size="xs"
                              ring={isPro ? "2px" : "1px"}
                              ringColor={
                                isPro ? "purple.500/50" : "whiteAlpha.300"
                              }
                              transition="transform 0.3s ease"
                            >
                              <Avatar.Image src={user.picture} />
                              <Avatar.Fallback>
                                {user.name?.[0]}
                              </Avatar.Fallback>
                            </Avatar.Root>
                            <VStack align="start" gap={0}>
                              <Text
                                fontSize="xs"
                                fontWeight="bold"
                                lineClamp={1}
                              >
                                {user.name}
                              </Text>
                              <Text
                                fontSize="xx-s"
                                color="fg.muted"
                                lineClamp={1}
                              >
                                {user.email}
                              </Text>
                            </VStack>
                          </HStack>

                          {/* ✅ Visible Credits inside the menu */}
                          <HStack
                            justify="space-between"
                            bg="blackAlpha.300"
                            _light={{ bg: "blackAlpha.50" }}
                            p={2}
                            rounded="lg"
                            onClick={() => setTopUpOpen(true)}
                            cursor="pointer"
                            _hover={{ bg: "whiteAlpha.100" }}
                          >
                            <HStack
                              gap={2}
                              color={isPro ? "purple.300" : "blue.300"}
                            >
                              <FaCoins size={12} />
                              <Text fontSize="xs" fontWeight="bold">
                                Credits:
                              </Text>
                            </HStack>
                            <Text fontSize="xs" fontFamily="mono">
                              {credits}
                            </Text>
                          </HStack>
                        </Box>

                        <Menu.Item
                          value="logout"
                          onClick={() => setLogoutOpen(true)}
                          color="red.400"
                          _hover={{ bg: "red.500/10" }}
                          borderRadius="xl"
                          cursor="pointer"
                          h="10"
                        >
                          <Icon as={FaSignOutAlt} mr={2} />
                          Log Out
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>
              </Box>
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

      {/* LOGOUT MODAL */}
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
            mx={4}
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
                  Are you sure you want to sign out?
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
                  Confirm
                </Button>
              </HStack>
            </VStack>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
};
