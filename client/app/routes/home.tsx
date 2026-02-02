import {
  Box,
  Button,
  Flex,
  Heading,
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

// --- META ---
export function meta({}: Route.MetaArgs) {
  return [{ title: "CourseForge" }];
}

// --- ANIMATIONS ---
// 1. Fluid Blob Movement (Slower, Organic)
const blobAnim = keyframes`
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
`;

// 2. Slow Float for Icons
const float = keyframes`
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;

// 3. Text Shine (Liquid Metal look)
const shine = keyframes`
  0% { background-position: 200% center; }
  100% { background-position: -200% center; }
`;

// 4. Entry Animation
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

// --- COMPONENTS ---

// Decorative Floating Icon (Enhanced with Glass Blur behind it)
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
    opacity={0.2} // Slightly higher opacity
    fontSize={size}
    animation={`${float} 8s ease-in-out infinite`} // Slower float
    style={{ animationDelay: `${delay}s` }}
    zIndex={1}
    pointerEvents="none"
    filter="drop-shadow(0 0 10px currentColor)" // Glow effect
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
      h="100vh"
      w="100vw"
      position="relative"
      overflow="hidden"
      bg="gray.50"
      _dark={{ bg: "#050505" }}
      transition="background 0.5s ease"
    >
      {/* --- BACKGROUND LAYERS --- */}

      {/* 1. NOISE TEXTURE (The "Premium" Glass Secret) */}
      <Box
        position="absolute"
        inset="0"
        zIndex={0}
        opacity={0.4}
        _dark={{ opacity: 0.2 }}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`,
        }}
        pointerEvents="none"
      />

      {/* 2. Liquid Gradients (Blobs) */}
      <Box
        position="absolute"
        top="-10%"
        left="-10%"
        w="70vw"
        h="70vw"
        bgGradient="radial(circle, blue.400, transparent 60%)"
        _dark={{ bgGradient: "radial(circle, blue.600, transparent 60%)" }}
        filter="blur(100px)"
        opacity={0.4}
        animation={`${blobAnim} 20s infinite alternate`} // Super slow liquid movement
        zIndex={0}
      />
      <Box
        position="absolute"
        bottom="-10%"
        right="-10%"
        w="60vw"
        h="60vw"
        bgGradient="radial(circle, purple.400, transparent 60%)"
        _dark={{ bgGradient: "radial(circle, purple.600, transparent 60%)" }}
        filter="blur(100px)"
        opacity={0.3}
        animation={`${blobAnim} 25s infinite alternate-reverse`}
        zIndex={0}
      />
      {/* 3rd Accent Blob for depth */}
      <Box
        position="absolute"
        top="40%"
        left="30%"
        w="40vw"
        h="40vw"
        bgGradient="radial(circle, pink.300, transparent 60%)"
        _dark={{ bgGradient: "radial(circle, cyan.800, transparent 60%)" }}
        filter="blur(120px)"
        opacity={0.2}
        animation={`${blobAnim} 30s infinite alternate`}
        zIndex={0}
      />

      {/* 3. Grid Overlay (Subtle Tech feel) */}
      <Box
        position="absolute"
        inset="0"
        opacity={0.2}
        bgImage="linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)"
        _dark={{
          opacity: 0.1,
          bgImage:
            "linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
        }}
        bgSize="80px 80px"
        pointerEvents="none"
        zIndex={0}
        style={{ maskImage: "radial-gradient(circle, black, transparent 80%)" }} // Fade grid at edges
      />

      {/* 4. Floating Glass Icons */}
      <FloatingIcon
        icon={FaRobot}
        top="15%"
        left="8%"
        color="blue.400"
        delay={0}
      />
      <FloatingIcon
        icon={FaCode}
        bottom="18%"
        left="15%"
        color="purple.400"
        delay={2}
      />
      <FloatingIcon
        icon={FaLayerGroup}
        top="25%"
        right="12%"
        color="pink.400"
        delay={1}
      />
      <FloatingIcon
        icon={FaMagic}
        bottom="22%"
        right="10%"
        color="cyan.400"
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
        py={6}
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
            style={{ backdropFilter: "blur(2px)" }} // Tiny readability boost
          >
            Course
            <Text as="span" color="blue.500">
              Forge
            </Text>
          </Heading>
        </HStack>
        <ColorModeSwitcher />
      </Flex>

      {/* --- HERO CONTENT --- */}
      <Flex
        h="full"
        align="center"
        justify="center"
        position="relative"
        zIndex={10}
        px={4}
      >
        <VStack gap={8} textAlign="center" maxW="4xl">
          {/* Glass Badge */}
          <Box
            animation={`${fadeInUp} 1s cubic-bezier(0.2, 0.8, 0.2, 1)`}
            px={5}
            py={1.5}
            rounded="full"
            bg="whiteAlpha.400"
            backdropFilter="blur(12px)" // Strong blur for glass effect
            border="1px solid"
            borderColor="whiteAlpha.400"
            _dark={{ bg: "whiteAlpha.100", borderColor: "whiteAlpha.200" }}
            boxShadow="0 4px 20px rgba(0,0,0,0.05)"
          >
            <Text
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="widest"
              textTransform="uppercase"
              bgGradient="linear(to-r, blue.600, purple.600)"
              _dark={{
                bgGradient: "linear(to-r, blue.300, purple.300)",
                color: "white",
              }}
              bgClip="text"
              color="gray.800"
            >
              The Future of Learning
            </Text>
          </Box>

          {/* Main Title */}
          <Box
            animation={`${fadeInUp} 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.1s backwards`}
          >
            <Heading
              size={{ base: "3xl", md: "6xl", lg: "7xl" }}
              lineHeight="1.1"
              fontWeight="900"
              letterSpacing="-0.02em"
              color="gray.900"
              _dark={{ color: "white" }}
              textShadow="0 20px 40px rgba(0,0,0,0.1)" // Soft shadow for depth
            >
              Turn Ideas Into <br />
              <Text
                as="span"
                bgClip="text"
                color="gray.900"
                _dark={{ color: "white" }}
                bgGradient="linear(to-r, blue.400, purple.500, pink.500, blue.400)"
                backgroundSize="300% auto"
                animation={`${shine} 6s linear infinite`}
                filter="drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))" // Glowing text
              >
                Interactive Courses
              </Text>
            </Heading>
          </Box>

          {/* Subtitle */}
          <Text
            fontSize={{ base: "lg", md: "2xl" }}
            color="gray.600"
            _dark={{ color: "gray.300" }}
            maxW="2xl"
            animation={`${fadeInUp} 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.2s backwards`}
            fontWeight="medium"
          >
            Generate comprehensive syllabi, lessons, and quizzes in seconds with
            AI. No scrolling, just creating.
          </Text>

          {/* --- ACTION AREA --- */}
          <Box
            mt={6}
            animation={`${fadeInUp} 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.3s backwards`}
            w="full"
            display="flex"
            justifyContent="center"
          >
            {isLoading ? (
              <Spinner size="lg" color="blue.400" />
            ) : isAuthenticated ? (
              <Button
                asChild
                size="lg"
                h="60px" // Taller button
                rounded="full"
                bgGradient="linear(to-r, blue.500, purple.600)"
                _hover={{
                  bgGradient: "linear(to-r, blue.400, purple.500)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 20px 40px -10px rgba(66, 153, 225, 0.5)",
                }}
                _active={{ transform: "translateY(0)" }}
                color="white"
                px={10}
                _dark={{ color: "gray.900"}}
                fontSize="lg"
                fontWeight="bold"
                transition="all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)"
              >
                <Link to="/dashboard">
                  Go to Dashboard <Icon as={FaArrowRight} ml={2} />
                </Link>
              </Button>
            ) : (
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={4}>
                {/* Secondary Button - Glass Ghost */}
                <Button
                  size="lg"
                  h="56px"
                  variant="ghost"
                  rounded="full"
                  px={8}
                  fontSize="md"
                  color="gray.700"
                  bg="whiteAlpha.50"
                  backdropFilter="blur(5px)"
                  borderWidth="1px"
                  borderColor="gray.200"
                  _dark={{ color: "white", borderColor: "whiteAlpha.200" }}
                  _hover={{
                    bg: "whiteAlpha.200",
                    borderColor: "blue.400",
                    transform: "translateY(-2px)",
                  }}
                  transition="all 0.3s"
                  onClick={handleLogin}
                >
                  <Icon as={FaSignInAlt} mr={2} /> Log In
                </Button>

                {/* Primary Button - Liquid Gradient */}
                <Button
                  size="lg"
                  h="56px"
                  rounded="full"
                  bg="gray.900"
                  _dark={{ bg: "white", color: "black" }}
                  color="white"
                  px={8}
                  fontSize="md"
                  fontWeight="bold"
                  shadow="xl"
                  _hover={{
                    transform: "translateY(-2px) scale(1.02)",
                    shadow: "2xl",
                    opacity: 0.95,
                  }}
                  transition="all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)"
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
