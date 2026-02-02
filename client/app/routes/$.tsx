import { Link, useLocation } from "react-router";
import { Box, Heading, Text, Button, Center, VStack } from "@chakra-ui/react";

// Keyframe animation for the "liquid" movement
const floatAnimation = `
  @keyframes float {
    0% { transform: translate(0, 0) rotate(0deg); }
    33% { transform: translate(30px, -50px) rotate(10deg); }
    66% { transform: translate(-20px, 20px) rotate(-5deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }
`;

export default function NotFound() {
  const location = useLocation();

  return (
    <Box
      h="100vh"
      w="full"
      pos="relative"
      overflow="hidden"
      bg="gray.900" // Dark background makes glass pop best
      color="white"
    >
      {/* Inject styles for animation */}
      <style>{floatAnimation}</style>

      {/* --- Liquid Background Blobs --- */}
      {/* Top Left Blob */}
      <Box
        pos="absolute"
        top="-10%"
        left="-10%"
        w="500px"
        h="500px"
        bgGradient="to-br"
        gradientFrom="cyan.400"
        gradientTo="purple.500"
        filter="blur(80px)"
        opacity="0.6"
        borderRadius="full"
        animation="float 10s infinite ease-in-out"
      />
      {/* Bottom Right Blob */}
      <Box
        pos="absolute"
        bottom="-10%"
        right="-10%"
        w="600px"
        h="600px"
        bgGradient="to-tl"
        gradientFrom="blue.500"
        gradientTo="pink.500"
        filter="blur(100px)"
        opacity="0.5"
        borderRadius="full"
        animation="float 14s infinite ease-in-out reverse"
      />

      {/* --- Glass Card Content --- */}
      <Center h="full" pos="relative" zIndex={1} p={4}>
        <VStack
          gap={8}
          textAlign="center"
          p={{ base: 8, md: 12 }}
          // Glassmorphism Styles
          bg="rgba(255, 255, 255, 0.05)"
          backdropFilter="blur(20px)"
          border="1px solid rgba(255, 255, 255, 0.1)"
          borderRadius="3xl"
          boxShadow="0 8px 32px 0 rgba(0, 0, 0, 0.37)"
          maxW="lg"
          w="full"
        >
          <Box>
            {/* Liquid Text Effect */}
            <Heading
              fontSize={{ base: "8xl", md: "9xl" }}
              fontWeight="black"
              lineHeight="1"
              bgGradient="to-r"
              gradientFrom="cyan.200"
              gradientTo="blue.400"
              bgClip="text"
              letterSpacing="tighter"
              filter="drop-shadow(0 0 10px rgba(0, 200, 255, 0.3))"
            >
              404
            </Heading>
            <Heading
              size="xl"
              fontWeight="medium"
              mt={2}
              color="whiteAlpha.900"
            >
              Page Not Found
            </Heading>
          </Box>

          <Text color="whiteAlpha.700" fontSize="lg">
            Oops! It seems the liquid spilled. The page{" "}
            <Text as="code" color="cyan.200" fontWeight="bold">
              {location.pathname}
            </Text>{" "}
            has evaporated.
          </Text>

          <Button
            asChild
            size="xl"
            variant="surface"
            colorPalette="cyan"
            rounded="full"
            fontWeight="bold"
            px={8}
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.4)",
            }}
            transition="all 0.3s"
          >
            <Link to="/dashboard">Flow Back Home</Link>
          </Button>
        </VStack>
      </Center>
    </Box>
  );
}
