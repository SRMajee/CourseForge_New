import {
  Box,
  Flex,
  Center,
  Spinner,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router"; // or 'react-router-dom'
import { useAuth0 } from "@auth0/auth0-react"; // 👈 Added
import { Navbar } from "~/components/layout/Navbar";
import { Sidebar } from "~/components/layout/Sidebar";

export default function AppLayout() {
  // 1. Use Auth0 Hook for auth state
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  // State
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);

  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(true);
    } else {
      setCollapsed(!isCollapsed);
    }
  };

  // 2. Protect the Route
  useEffect(() => {
    // If Auth0 is done loading and user is NOT authenticated, redirect
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect(); // Or navigate("/login")
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  // 3. Show Spinner while Auth0 initializes
  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  // 4. If not authenticated (and not loading), render null (useEffect handles redirect)
  if (!isAuthenticated) return null;

  return (
    <Flex direction="column" minH="100vh">
      <Navbar onToggleSidebar={handleToggleSidebar} />

      <Flex flex="1">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={isCollapsed}
        />

        <Box flex="1" p={6} bg="bg.muted" overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}
