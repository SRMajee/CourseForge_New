import { Outlet, Link } from "react-router";
import { Box, Flex, Heading, Text, Center, VStack } from "@chakra-ui/react";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";

export default function AuthLayout() {
  return (
    <Flex minH="100vh" direction={{ base: "column", md: "row" }}>
      {/* Left Side: Brand / Marketing */}
      <Box
        flex="1"
        bg="blue.600"
        color="white"
        p={12}
        display={{ base: "none", md: "flex" }}
        flexDirection="column"
        justifyContent="space-between"
      >
        <Heading size="lg">CourseForge</Heading>
        <VStack align="start" gap={6} maxW="md">
          <Heading size="4xl" lineHeight="tight">
            Turn your ideas into courses in seconds.
          </Heading>
          <Text fontSize="xl" opacity={0.9}>
            Join thousands of creators using AI to build interactive learning
            experiences.
          </Text>
        </VStack>
        <Text fontSize="sm" opacity={0.7}>
          © 2026 CourseForge Inc.
        </Text>
      </Box>

      {/* Right Side: Form Container */}
      <Center flex="1" bg="bg.panel" p={8} position="relative">
        <Box position="absolute" top={4} right={4}>
          <ColorModeSwitcher />
        </Box>

        <Box w="full" maxW="md">
          <Outlet />
        </Box>
      </Center>
    </Flex>
  );
}
