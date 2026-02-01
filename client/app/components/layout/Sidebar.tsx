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
import { FaPlus, FaComment, FaCog, FaHome, FaBook } from "react-icons/fa"; // Added FaBook
import { useCourses } from "~/features/course/hooks/useCourses";
import { isToday, isYesterday, isThisWeek, parseISO } from "date-fns";

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

  const SidebarContent = () => (
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
          size={isCollapsed ? "sm" : "md"}
          onClick={() => navigate("/dashboard")}
          justifyContent={isCollapsed ? "center" : "flex-start"}
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
          {!isCollapsed && <Text ml={2}>New Chat</Text>}
        </Button>
      </Box>

      <VStack align="stretch" gap={1} mb={6}>
        {/* DASHBOARD */}
        <NavLink to="/dashboard" style={{ textDecoration: "none" }}>
          {({ isActive }) => (
            <HStack
              p={2}
              borderRadius="xl"
              cursor="pointer"
              justify={isCollapsed ? "center" : "flex-start"}
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              color={isActive ? "fg.default" : "fg.muted"}
              _hover={{ bg: "whiteAlpha.50" }}
              transition="all 0.2s"
            >
              <Icon opacity={isActive ? 1 : 0.7}>
                <FaHome />
              </Icon>
              {!isCollapsed && (
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

        {/* ✅ MY LIBRARY (Added) */}
        <NavLink to="/courses" style={{ textDecoration: "none" }}>
          {({ isActive }) => (
            <HStack
              p={2}
              borderRadius="xl"
              cursor="pointer"
              justify={isCollapsed ? "center" : "flex-start"}
              bg={isActive ? "whiteAlpha.100" : "transparent"}
              color={isActive ? "fg.default" : "fg.muted"}
              _hover={{ bg: "whiteAlpha.50" }}
              transition="all 0.2s"
            >
              <Icon opacity={isActive ? 1 : 0.7}>
                <FaBook />
              </Icon>
              {!isCollapsed && (
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
          "&::-webkit-scrollbar": { width: "0px" }, // Hidden scrollbar for sleekness
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
                  {!isCollapsed && (
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
                      >
                        {({ isActive }) => (
                          <HStack
                            p={2}
                            h="36px"
                            borderRadius="lg"
                            justify={isCollapsed ? "center" : "flex-start"}
                            bg={isActive ? "whiteAlpha.100" : "transparent"}
                            color={isActive ? "fg.default" : "fg.muted"}
                            _hover={{
                              bg: "whiteAlpha.50",
                              color: "fg.default",
                            }}
                            transition="all 0.2s"
                          >
                            {!isActive && (
                              <Icon fontSize="xs" opacity={0.5}>
                                <FaComment />
                              </Icon>
                            )}
                            {!isCollapsed && (
                              <Text fontSize="sm" truncate>
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
        <NavLink to="/settings" style={{ textDecoration: "none" }}>
          {({ isActive }) => (
            <HStack
              p={2}
              borderRadius="xl"
              justify={isCollapsed ? "center" : "flex-start"}
              color={isActive ? "fg.default" : "fg.muted"}
              _hover={{ bg: "whiteAlpha.50", color: "fg.default" }}
            >
              <Icon>
                <FaCog />
              </Icon>
              {!isCollapsed && <Text fontSize="sm">Settings</Text>}
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
          <Drawer.Content bg="transparent" boxShadow="none">
            <Drawer.Body p={0}>
              <SidebarContent />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
      <Box
        display={{ base: "none", md: "block" }}
        w={isCollapsed ? "72px" : "260px"}
        h="100%"
        transition="width 0.4s cubic-bezier(0.16, 1, 0.3, 1)" // Apple ease
      >
        <SidebarContent />
      </Box>
    </>
  );
};
