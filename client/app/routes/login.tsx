import { Heading, VStack, Text, Center, Button } from "@chakra-ui/react";
import { useAuth0 } from "@auth0/auth0-react";
import { FaGoogle } from "react-icons/fa";

export default function Login() {
  const { loginWithRedirect } = useAuth0();

  return (
    <VStack gap={6} align="stretch">
      <Heading size="2xl">Welcome back</Heading>
      <Text color="fg.muted">Sign in to CourseForge</Text>

      <Center w="full">
        <Button
          variant="outline"
          width="full"
          size="lg"
          onClick={() => loginWithRedirect()}
        >
          <FaGoogle style={{ marginRight: "8px" }} />
          Continue with Google
        </Button>
      </Center>
    </VStack>
  );
}
