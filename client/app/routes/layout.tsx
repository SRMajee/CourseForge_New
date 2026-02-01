import {
  Box,
  Flex,
  Center,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { useAuth0 } from "@auth0/auth0-react";
import { Navbar } from "~/components/layout/Navbar";
import { Sidebar } from "~/components/layout/Sidebar";

export default function AppLayout() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) loginWithRedirect();
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (isLoading)
    return (
      <Center h="100vh" bg="bg.canvas">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  if (!isAuthenticated) return null;

  return (
    <Flex
      direction="column"
      h="100vh"
      overflow="hidden"
      // ✅ 1. Deep, Rich Background Base
      bgGradient="to-br"
      gradientFrom="gray.50"
      gradientTo="gray.100"
      _dark={{
        gradientFrom: "#050505",
        gradientTo: "#0a0a0a",
      }}
      position="relative"
    >
      {/* ✅ 2. Ambient Light Blobs (The "Liquid" Source) */}
      <Box
        position="fixed"
        top="-30%"
        left="-10%"
        w="70vw"
        h="70vw"
        bg="blue.500"
        opacity={0.06}
        filter="blur(120px)"
        zIndex={0}
        pointerEvents="none"
        rounded="full"
        mixBlendMode="screen"
      />
      <Box
        position="fixed"
        bottom="-30%"
        right="-10%"
        w="60vw"
        h="60vw"
        bg="purple.500"
        opacity={0.06}
        filter="blur(140px)"
        zIndex={0}
        pointerEvents="none"
        rounded="full"
        mixBlendMode="screen"
      />

      {/* 3. Navbar (Floating Glass) */}
      <Box zIndex={100} position="relative" w="full">
        <Navbar
          onToggleSidebar={() =>
            isMobile ? setSidebarOpen(true) : setCollapsed(!isCollapsed)
          }
        />
      </Box>

      <Flex flex="1" overflow="hidden" position="relative" zIndex={1}>
        {/* 4. Sidebar (Floating Glass) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
        />

        {/* 5. Main Stage (Transparent to show bg) */}
        <Box
          flex="1"
          position="relative"
          overflowY="auto"
          overflowX="hidden"
          p={0}
          // Custom Scrollbar for "Premium" feel
          css={{
            "&::-webkit-scrollbar": { width: "6px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0,0,0,0.1)",
              borderRadius: "10px",
            },
            _dark: {
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(255,255,255,0.1)",
              },
            },
          }}
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
