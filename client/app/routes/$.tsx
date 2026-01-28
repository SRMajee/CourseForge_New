import { Link, useLocation } from "react-router";
import { Box, Heading, Text, Button, Center, VStack } from "@chakra-ui/react";

export default function NotFound() {
  const location = useLocation();

  return (
    <Center h="100vh" bg="bg.canvas">
      <VStack gap={6} textAlign="center">
        <Heading size="4xl" color="blue.500">
          404
        </Heading>
        <Box>
          <Heading size="lg" mb={2}>
            Page Not Found
          </Heading>
          <Text color="fg.muted">
            Oops! The page{" "}
            <Text as="code" fontWeight="bold">
              {location.pathname}
            </Text>{" "}
            does not exist.
          </Text>
        </Box>

        <Button asChild colorPalette="blue" size="lg">
          <Link to="/dashboard">Go Home</Link>
        </Button>
      </VStack>
    </Center>
  );
}
