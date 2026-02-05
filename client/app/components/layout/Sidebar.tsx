import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Drawer,
  Button,
  Skeleton,
  Flex,
} from "@chakra-ui/react";
import { NavLink, useNavigate } from "react-router";
import { FaPlus, FaCog, FaHome, FaBook } from "react-icons/fa";
import { useCourses } from "~/features/course/hooks/useCourses";
import { isToday, isYesterday, parseISO } from "date-fns";

const groupCoursesByDate = (courses: any[]) => {
  const groups = {
    Today: [] as any[],
    Yesterday: [] as any[],
    Older: [] as any[],
  };
  courses.forEach((course) => {
    const date = parseISO(course.createdAt || new Date().toISOString());
    if (isToday(date)) groups.Today.push(course);
    else if (isYesterday(date)) groups.Yesterday.push(course);
    else groups.Older.push(course);
  });
  return groups;
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
}

export const Sidebar = ({ isOpen, onClose, isCollapsed }: SidebarProps) => {
  const navigate = useNavigate();
  const { data: response, isLoading } = useCourses(1, 50);
  const courses = response?.data || [];
  const groupedHistory = groupCoursesByDate(courses);

  // ✅ Helper to close drawer on mobile when clicking a link
  const handleMobileNav = () => {
    if (isOpen) onClose();
  };

  const SidebarContent = ({ isMobile = false }) => (
    <Flex
      direction="column"
      h="full"
      pt={6}
      px={3}
      pb={4}
      // ✅ "APPLE LIQUID GLASS" SIDEBAR
      bg="rgba(255, 255, 255, 0.02)"
      _dark={{ bg: "rgba(0, 0, 0, 0.02)" }}
      backdropFilter="blur(24px) saturate(180%)"
    >
      {/* NEW CHAT */}
      <Box mb={6}>
        <Button
          w="full"
          colorPalette="blue"
          variant="surface"
          // ✅ Keep 'md' size on mobile (isCollapsed doesn't apply to drawer)
          size={isCollapsed && !isMobile ? "sm" : "md"}
          onClick={() => {
            navigate("/dashboard");
            handleMobileNav();
          }}
          justifyContent={isCollapsed && !isMobile ? "center" : "flex-start"}
          rounded="2xl"
          shadow="sm"
          bg="blue.500/10"
          color="blue.400"
          borderWidth="1px"
          borderColor="blue.500/20"
          _hover={{
            transform: "translateY(-1px)",
            bg: "blue.500/20",
            borderColor: "blue.500/40",
          }}
          transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
        >
          <Icon fontSize="md">
            <FaPlus />
          </Icon>
          {(!isCollapsed || isMobile) && <Text ml={2}>New Chat</Text>}
        </Button>
      </Box>

      <VStack align="stretch" gap={1} mb={6}>
        {/* DASHBOARD */}
        <NavLink to="/dashboard" style={{ textDecoration: "none" }} onClick={handleMobileNav}>
          {({ isActive }) => (
            <HStack
              p={2}
              borderRadius="xl"
              cursor="pointer"
              justify={isCollapsed && !isMobile ? "center" : "flex-start"}
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              color={isActive ? "fg.default" : "fg.muted"}
              _hover={{ bg: "whiteAlpha.50" }}
              transition="all 0.2s"
            >
              <Icon opacity={isActive ? 1 : 0.7}>
                <FaHome />
              </Icon>
              {(!isCollapsed || isMobile) && (
                <Text
                  fontWeight={isActive ? "semibold" : "medium"}
                  fontSize="sm"
                >
                  Dashboard
                </Text>
              )}
            </HStack>
          )}
        </NavLink>

        {/* MY LIBRARY */}
        <NavLink to="/courses" style={{ textDecoration: "none" }} onClick={handleMobileNav}>
          {({ isActive }) => (
            <HStack
              p={2}
              borderRadius="xl"
              cursor="pointer"
              justify={isCollapsed && !isMobile ? "center" : "flex-start"}
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              color={isActive ? "fg.default" : "fg.muted"}
              _hover={{ bg: "whiteAlpha.50" }}
              transition="all 0.2s"
            >
              <Icon opacity={isActive ? 1 : 0.7}>
                <FaBook />
              </Icon>
              {(!isCollapsed || isMobile) && (
                <Text
                  fontWeight={isActive ? "semibold" : "medium"}
                  fontSize="sm"
                >
                  My Library
                </Text>
              )}
            </HStack>
          )}
        </NavLink>
      </VStack>

      {/* HISTORY */}
      <Box
        flex="1"
        overflowY="auto"
        overflowX="hidden"
        css={{
          "&::-webkit-scrollbar": { width: "0px" },
        }}
      >
        {isLoading ? (
          <VStack align="start" gap={3} px={1} opacity={0.5}>
            <Skeleton height="16px" width="70%" rounded="md" />
            <Skeleton height="16px" width="50%" rounded="md" />
          </VStack>
        ) : (
          Object.entries(groupedHistory).map(
            ([label, items]) =>
              items.length > 0 && (
                <Box key={label} mb={6}>
                  {(!isCollapsed || isMobile) && (
                    <Text
                      fontSize="10px"
                      fontWeight="bold"
                      color="fg.subtle"
                      mb={2}
                      px={2}
                      textTransform="uppercase"
                      letterSpacing="widest"
                      opacity={0.6}
                    >
                      {label}
                    </Text>
                  )}
                  <VStack align="stretch" gap={1}>
                    {items.map((course) => (
                      <NavLink
                        key={course._id}
                        to={`/course/${course._id}`}
                        style={{ textDecoration: "none" }}
                        onClick={handleMobileNav}
                      >
                        {({ isActive }) => (
                          <HStack
                            p={2}
                            h="36px"
                            borderRadius="lg"
                            justify={isCollapsed && !isMobile ? "center" : "flex-start"}
                            bg={isActive ? "whiteAlpha.100" : "transparent"}
                            color={isActive ? "fg.default" : "fg.muted"}
                            _hover={{
                              bg: "whiteAlpha.50",
                              color: "fg.default",
                            }}
                            transition="all 0.2s"
                          >
                            {(!isCollapsed || isMobile) && (
                              <Text fontSize="sm" lineClamp={1}>
                                {course.title}
                              </Text>
                            )}
                          </HStack>
                        )}
                      </NavLink>
                    ))}
                  </VStack>
                </Box>
              ),
          )
        )}
      </Box>

      {/* SETTINGS */}
      <Box mt="auto" pt={2} borderTopWidth="1px" borderColor="whiteAlpha.100">
        <NavLink to="/settings" style={{ textDecoration: "none" }} onClick={handleMobileNav}>
          {({ isActive }) => (
            <HStack
              p={2}
              borderRadius="xl"
              justify={isCollapsed && !isMobile ? "center" : "flex-start"}
              color={isActive ? "fg.default" : "fg.muted"}
              _hover={{ bg: "whiteAlpha.50", color: "fg.default" }}
            >
              <Icon>
                <FaCog />
              </Icon>
              {(!isCollapsed || isMobile) && <Text fontSize="sm">Settings</Text>}
            </HStack>
          )}
        </NavLink>
      </Box>
    </Flex>
  );

  return (
    <>
      <Drawer.Root open={isOpen} placement="start" onOpenChange={onClose}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          {/* ✅ Styled Drawer Content */}
          <Drawer.Content 
            bg="rgba(10, 10, 10, 0.95)" // Darker bg for better contrast on mobile
            _light={{ bg: "rgba(255, 255, 255, 0.95)" }}
            backdropFilter="blur(20px)"
            boxShadow="none"
          >
            <Drawer.Body p={0}>
              <SidebarContent isMobile={true} />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
      <Box
        display={{ base: "none", md: "block" }}
        w={isCollapsed ? "72px" : "260px"}
        h="100%"
        transition="width 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
      >
        <SidebarContent />
      </Box>
    </>
  );
};