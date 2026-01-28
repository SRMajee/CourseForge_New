import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Spacer,
  VStack,
} from "@chakra-ui/react";
import { Link } from "react-router";
import { ColorModeSwitcher } from "~/components/common/ColorModeSwitcher";

export default function Home() {
  return (
    <Box minH="100vh" bg="bg">
      {/* Landing Page Specific Header */}
      <Box as="header" p={4}>
        <Flex alignItems="center" maxW="container.xl" mx="auto">
          <Heading size="md" color="brand.600">
            CourseForge
          </Heading>
          <Spacer />
          <ColorModeSwitcher />
        </Flex>
      </Box>

      {/* Hero Content */}
      <Container centerContent pt={20}>
        <VStack gap={6}>
          <Heading size="3xl" textAlign="center">
            Create Courses with AI
          </Heading>
          <Button asChild size="xl" colorPalette="blue">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        </VStack>
      </Container>
    </Box>
  );
}
