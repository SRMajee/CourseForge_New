import {
  Box,
  Button,
  ChakraProvider,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";
import { system } from "./theme";
import { Auth0Provider } from "@auth0/auth0-react";
import { AuthSync } from "./components/auth/AuthSync";
import AxiosInterceptor from "./components/auth/AxiosInterceptor";
import { useEffect, useState } from "react";
import { useAuthStore } from "./store/authStore"; // 👈 Import Auth Store
import { useSocketStore } from "./store/socketStore"; // 👈 Import Socket Store
import { useConfigStore } from "./store/configStore";
import { Toaster, toaster } from "~/components/ui/toaster"; // 👈 Import toaster
import { useSocketCredits } from "./hooks/useSocketCredits";

// 👇 NEW: Component to handle Socket Connection
const SocketClient = () => {
  const { user } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    if (user?._id) {
      connect(user._id);
    }

    return () => {
      disconnect();
    };
  }, [user?._id, connect, disconnect]);

  return null; // Invisible component
};

export function Layout({ children }: { children: React.ReactNode }) {
  useSocketCredits();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error: any) => {
            // 🛑 STOP: If this is a Clarification (422), do NOT show a global toast.
            // The local component (CreateCourseModal) will handle it.
            if (
              error.response?.status === 422 ||
              error.isClarification ||
              error.response?.data?.code === "CLARIFICATION_NEEDED"
            ) {
              return;
            }

            // For other real errors (500, Network), show the toaster here
            toaster.create({
              title: "Error",
              description:
                error.response?.data?.message || "An unexpected error occurred",
              type: "error",
            });
          },
        }),
      }),
  );
  const fetchConfig = useConfigStore((state) => state.fetchConfig);

  useEffect(() => {
    fetchConfig();
  }, []);
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  const redirectUri =
    typeof window !== "undefined" ? window.location.origin : "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider attribute="class" disableTransitionOnChange>
          <ChakraProvider value={system}>
            {domain && clientId && (
              <Auth0Provider
                domain={domain}
                clientId={clientId}
                authorizationParams={{
                  redirect_uri: redirectUri,
                  audience: audience,
                  scope: "openid profile email offline_access",
                }}
                useRefreshTokens={true}
                cacheLocation="localstorage"
              >
                <QueryClientProvider client={queryClient}>
                  <AuthSync />
                  <AxiosInterceptor>
                    <SocketClient />
                    {children}
                  </AxiosInterceptor>
                </QueryClientProvider>
              </Auth0Provider>
            )}

            <Toaster />
          </ChakraProvider>
        </ThemeProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

// ... (Keep ErrorBoundary exactly as it was)
export function ErrorBoundary() {
  const error = useRouteError();

  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404 ? "Page not found" : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <ThemeProvider attribute="class">
      <ChakraProvider value={system}>
        <Box
          h="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="gray.50"
          p={4}
        >
          <VStack gap={4} textAlign="center">
            <Heading size="2xl" color="red.500">
              {message}
            </Heading>
            <Text fontSize="lg" color="gray.600">
              {details}
            </Text>
            {stack && (
              <Box
                as="pre"
                w="full"
                p={4}
                bg="gray.100"
                overflowX="auto"
                fontSize="sm"
              >
                {stack}
              </Box>
            )}
            <Button asChild variant="outline">
              <a href="/">Go Home</a>
            </Button>
          </VStack>
        </Box>
      </ChakraProvider>
    </ThemeProvider>
  );
}
