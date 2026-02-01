import {
  Box,
  Button,
  Flex,
  Heading,
  Spacer,
  VStack,
  HStack,
  Spinner,
  Text,
  Icon,
  SimpleGrid,
} from "@chakra-ui/react";
import { Link } from "react-router";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";
import { useAuth0 } from "@auth0/auth0-react";
import {
  FaArrowRight,
  FaSignInAlt,
  FaUserPlus,
  FaRobot,
  FaLayerGroup,
  FaCode,
  FaMagic,
} from "react-icons/fa";
import { keyframes } from "@emotion/react";
import type { Route } from "./+types/dashboard";

// --- ANIMATIONS ---
export function meta({}: Route.MetaArgs) {
  return [{ title: "CourseForge" }];
}
const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-30px) rotate(15deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

const drift = keyframes`
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(60px, -50px) scale(1.1); }
  66% { transform: translate(-40px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
`;

const shine = keyframes`
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
`;

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

// --- COMPONENTS ---

// Decorative Floating Icon
const FloatingIcon = ({
  icon,
  top,
  left,
  right,
  bottom,
  delay,
  color,
  size = "3xl",
}: any) => (
  <Box
    position="absolute"
    top={top}
    left={left}
    right={right}
    bottom={bottom}
    color={color}
    opacity={0.15}
    fontSize={size}
    animation={`${float} 5s ease-in-out infinite`}
    style={{ animationDelay: `${delay}s` }}
    zIndex={0}
    pointerEvents="none"
  >
    <Icon as={icon} />
  </Box>
);

export default function Home() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  const handleSignup = () => {
    loginWithRedirect({
      appState: { returnTo: "/dashboard" },
      authorizationParams: { screen_hint: "signup" },
    });
  };

  const handleLogin = () => {
    loginWithRedirect({
      appState: { returnTo: "/dashboard" },
    });
  };

  return (
    <Box
      h="100vh" // ✅ FORCE SINGLE PAGE NO SCROLL
      w="100vw"
      position="relative"
      overflow="hidden"
      bg="gray.50"
      _dark={{ bg: "#050505" }} // Deep black for better contrast
      transition="background 0.2s"
    >
      {/* --- BACKGROUND LAYERS --- */}

      {/* 1. Dynamic Gradient Blobs */}
      <Box
        position="absolute"
        top="-20%"
        left="-10%"
        w="60vw"
        h="60vw"
        bgGradient="radial(circle, blue.400, transparent 70%)"
        _dark={{ bgGradient: "radial(circle, blue.900, transparent 70%)" }}
        filter="blur(120px)"
        opacity="0.15" // Reduced opacity for text visibility
        animation={`${drift} 5s infinite alternate`}
        zIndex={0}
      />
      <Box
        position="absolute"
        bottom="-20%"
        right="-10%"
        w="50vw"
        h="50vw"
        bgGradient="radial(circle, purple.400, transparent 70%)"
        _dark={{ bgGradient: "radial(circle, purple.900, transparent 70%)" }}
        filter="blur(120px)"
        opacity="0.15" // Reduced opacity for text visibility
        animation={`${drift} 2s infinite alternate-reverse`}
        zIndex={0}
      />

      {/* 2. Grid Overlay */}
      <Box
        position="absolute"
        inset="0"
        opacity={0.3}
        _dark={{ opacity: 0.1 }}
        bgImage="linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)"
        css={{
          ".chakra-ui-dark &": {
            backgroundImage:
              "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
          },
        }}
        bgSize="60px 60px"
        pointerEvents="none"
        zIndex={0}
      />

      {/* 3. Floating Icons */}
      <FloatingIcon
        icon={FaRobot}
        top="15%"
        left="8%"
        color="blue.500"
        delay={0}
      />
      <FloatingIcon
        icon={FaCode}
        bottom="15%"
        left="12%"
        color="purple.500"
        delay={2}
      />
      <FloatingIcon
        icon={FaLayerGroup}
        top="20%"
        right="10%"
        color="pink.500"
        delay={1}
      />
      <FloatingIcon
        icon={FaMagic}
        bottom="20%"
        right="8%"
        color="cyan.500"
        delay={3}
      />

      {/* --- HEADER --- */}
      <Flex
        as="header"
        position="fixed"
        top={0}
        w="full"
        zIndex={100}
        px={8}
        py={4}
        align="center"
        justify="space-between"
      >
        <HStack gap={2}>
          <Heading
            size="md"
            fontWeight="bold"
            letterSpacing="tight"
            color="gray.900"
            _dark={{ color: "white" }}
          >
            Course
            <Text as="span" color="blue.500">
              Forge
            </Text>
          </Heading>
        </HStack>
        <ColorModeSwitcher />
      </Flex>

      {/* --- HERO CONTENT (Centered Vertically) --- */}
      <Flex
        h="full"
        align="center"
        justify="center"
        position="relative"
        zIndex={10}
        px={4}
      >
        <VStack gap={6} textAlign="center" maxW="3xl">
          {/* Animated Badge */}
          <Box
            animation={`${fadeInUp} 0.8s ease-out`}
            px={3}
            py={1}
            rounded="full"
            bg="whiteAlpha.500"
            borderWidth="1px"
            borderColor="gray.900"
            _dark={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.200" }}
            backdropFilter="blur(8px)"
          >
            <Text
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="widest"
              textTransform="uppercase"
              // ✅ Fix: Added 'color="transparent"' and lighter colors for dark mode
              bgGradient="linear(to-r, blue.600, purple.600)"
              _dark={{
                bgGradient: "linear(to-r, blue.300, purple.300)",
                color: "white",
              }}
              bgClip="text"
              color="gray.900" // ✅ Explicit dark color for Light Mode
            >
              The Future of Learning
            </Text>
          </Box>

          {/* Main Title - Visibility Fixed */}
          <Box animation={`${fadeInUp} 0.8s ease-out 0.2s backwards`}>
            <Heading
              size={{ base: "3xl", md: "6xl" }} // Slightly smaller to ensure fit
              lineHeight="1.1"
              fontWeight="800"
              letterSpacing="tight"
              color="gray.900" // ✅ Explicit dark color for Light Mode
              _dark={{ color: "white" }} // ✅ Explicit white for Dark Mode
            >
              Turn Ideas Into <br />
              <Text
                as="span"
                bgClip="text"
                color="gray.900" // ✅ Explicit dark color for Light Mode
                _dark={{ color: "white" }} // ✅ Explicit white for Dark Mode
                bgGradient="linear(to-r, blue.400, purple.400, pink.400)"
                backgroundSize="200% auto"
                animation={`${shine} 4s linear infinite`}
              >
                Interactive Courses
              </Text>
            </Heading>
          </Box>

          {/* Subtitle */}
          <Text
            fontSize={{ base: "md", md: "xl" }}
            color="gray.600"
            _dark={{ color: "gray.400" }}
            maxW="2xl"
            animation={`${fadeInUp} 0.8s ease-out 0.4s backwards`}
          >
            Generate comprehensive syllabi, lessons, and quizzes in seconds with
            AI. No scrolling, just creating.
          </Text>

          {/* --- ACTION AREA --- */}
          <Box
            mt={4}
            animation={`${fadeInUp} 0.8s ease-out 0.6s backwards`}
            w="full"
            display="flex"
            justifyContent="center"
          >
            {isLoading ? (
              <Spinner size="md" color="blue.400" />
            ) : isAuthenticated ? (
              <Button
                asChild
                size="lg" // ✅ Smaller, standard size
                h="48px"
                rounded="full" // ✅ Pill shape aesthetic
                bgGradient="linear(to-r, blue.600, purple.600)"
                _dark={{ color: "black" }}
                color="white"
                px={8}
                fontSize="md"
                fontWeight="semibold"
                _hover={{
                  bgGradient: "linear(to-r, blue.500, purple.500)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 10px 20px rgba(66, 153, 225, 0.4)",
                }}
                transition="all 0.2s"
              >
                <Link to="/dashboard">
                  Go to Dashboard <Icon as={FaArrowRight} ml={2} size="sm" />
                </Link>
              </Button>
            ) : (
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
                <Button
                  size="lg" // ✅ Smaller
                  h="48px"
                  variant="ghost"
                  rounded="full"
                  px={8}
                  fontSize="sm"
                  color="gray.700"
                  _dark={{ color: "gray.300" }}
                  borderWidth="1px"
                  borderColor="transparent"
                  _hover={{
                    bg: "gray.100",
                    _dark: {
                      bg: "whiteAlpha.100",
                      borderColor: "whiteAlpha.300",
                    },
                  }}
                  onClick={handleLogin}
                >
                  <Icon as={FaSignInAlt} mr={2} /> Log In
                </Button>

                <Button
                  size="lg" // ✅ Smaller
                  h="48px"
                  rounded="full"
                  bg="gray.900"
                  _dark={{ bg: "white", color: "black" }}
                  color="white"
                  px={8}
                  fontSize="sm"
                  fontWeight="bold"
                  shadow="md"
                  _hover={{
                    transform: "translateY(-1px)",
                    shadow: "lg",
                    opacity: 0.9,
                  }}
                  onClick={handleSignup}
                >
                  <Icon as={FaUserPlus} mr={2} /> Sign Up Free
                </Button>
              </SimpleGrid>
            )}
          </Box>
        </VStack>
      </Flex>
    </Box>
  );
}
