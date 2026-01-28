import { Heading, Text, VStack, Button, HStack } from "@chakra-ui/react";
import { Link } from "react-router"; // or 'react-router-dom'
import { FaCheckCircle, FaGoogle } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";

export default function Signup() {
  const { loginWithRedirect } = useAuth0();

  const handleSignup = () => {
    loginWithRedirect({
      authorizationParams: {
        screen_hint: "signup", // 👈 Opens Auth0 directly to the Signup tab
      },
    });
  };

  return (
    <VStack gap={6} align="stretch">
      <VStack gap={2} align="start">
        <Heading size="2xl">Create an account</Heading>
        <Text color="fg.muted">
          Already have an account?{" "}
          <Link to="/login" style={{ color: "var(--chakra-colors-blue-500)" }}>
            Log in
          </Link>
        </Text>
      </VStack>

      {/* Value Props */}
      <VStack align="start" gap={3} my={2}>
        <FeatureItem text="5 Free AI Credits" />
        <FeatureItem text="Access to all templates" />
        <FeatureItem text="Export to PDF" />
      </VStack>

      <VStack pt={4}>
        <Button
          colorPalette="blue"
          width="full"
          size="lg"
          onClick={handleSignup}
        >
          <FaGoogle style={{ marginRight: "8px" }} />
          Sign Up with Google
        </Button>

        <Text fontSize="xs" color="fg.muted" textAlign="center" mt={2}>
          By continuing, you agree to our Terms of Service.
        </Text>
      </VStack>
    </VStack>
  );
}

// Replaced your custom helper with a standard component for clarity
function FeatureItem({ text }: { text: string }) {
  return (
    <HStack gap={3}>
      <FaCheckCircle color="var(--chakra-colors-green-500)" />
      <Text fontSize="sm">{text}</Text>
    </HStack>
  );
}
