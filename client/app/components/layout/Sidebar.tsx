import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Drawer,
  Tooltip,
  Spacer, // 👈 Added Spacer
} from "@chakra-ui/react";
import { NavLink } from "react-router";
import { FaHome, FaBook, FaCog } from "react-icons/fa";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

const LinkItems = [
  { name: "Dashboard", icon: FaHome, path: "/dashboard" },
  { name: "My Courses", icon: FaBook, path: "/courses" },
  { name: "Settings", icon: FaCog, path: "/settings" },
];

export const Sidebar = ({ isOpen, onClose, isCollapsed }: SidebarProps) => {
  const SidebarContent = () => (
    <VStack align="stretch" gap={2} h="full" pt={4}>
      {LinkItems.map((link) => (
        <Tooltip.Root
          key={link.name}
          disabled={!isCollapsed}
          positioning={{ placement: "right" }}
        >
          <Tooltip.Trigger asChild>
            <NavLink
              to={link.path}
              style={({ isActive }) => ({
                textDecoration: "none",
                backgroundColor: isActive
                  ? "var(--chakra-colors-blue-50)"
                  : "transparent",
                borderRadius: "8px",
              })}
            >
              {({ isActive }) => (
                <HStack
                  p={3}
                  gap={4}
                  borderRadius="md"
                  cursor="pointer"
                  justify={isCollapsed ? "center" : "flex-start"}
                  color={isActive ? "blue.600" : "fg.muted"}
                  _hover={{
                    bg: "bg.subtle",
                    color: "blue.600",
                  }}
                  transition="all 0.2s"
                >
                  <Icon fontSize="lg">
                    <link.icon />
                  </Icon>
                  {!isCollapsed && (
                    <Text fontWeight={isActive ? "bold" : "medium"}>
                      {link.name}
                    </Text>
                  )}
                </HStack>
              )}
            </NavLink>
          </Tooltip.Trigger>
          <Tooltip.Content>{link.name}</Tooltip.Content>
        </Tooltip.Root>
      ))}

      {/* --- Pushes everything below to the bottom --- */}
      <Spacer />

    </VStack>
  );

  return (
    <>
      <Drawer.Root open={isOpen} placement="start" onOpenChange={onClose}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Menu</Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body>
              {/* Mobile always shows full content, so UsageStats will be visible */}
              <SidebarContent />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>

      <Box
        display={{ base: "none", md: "block" }}
        w={isCollapsed ? "70px" : "240px"}
        borderRightWidth="1px"
        borderColor="border.muted"
        h="calc(100vh - 64px)"
        position="sticky"
        top="16"
        bg="bg.panel"
        p={2}
        transition="width 0.2s ease-in-out"
        overflowX="hidden"
      >
        <SidebarContent />
      </Box>
    </>
  );
};
