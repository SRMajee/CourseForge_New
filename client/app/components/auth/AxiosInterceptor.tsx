import { useEffect, useState, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { api } from "~/services/api";
import { Center, Spinner } from "@chakra-ui/react";

const AxiosInterceptor = ({ children }: { children: React.ReactNode }) => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const [isReady, setIsReady] = useState(false);

  // 👇 1. Store the latest Auth0 values in Refs
  // This allows the interceptor to access the CURRENT value instantly,
  // even if the interceptor itself was defined in a previous render.
  const getTokenRef = useRef(getAccessTokenSilently);
  const isAuthenticatedRef = useRef(isAuthenticated);

  // Keep refs synced with every render
  useEffect(() => {
    getTokenRef.current = getAccessTokenSilently;
    isAuthenticatedRef.current = isAuthenticated;
  });

  useEffect(() => {
    // 2. Register the interceptor ONLY ONCE
    const requestInterceptor = api.interceptors.request.use(
      async (config) => {
        // 3. Read from Refs inside the callback (No Stale Closures!)
        // We only try to get the token if Auth0 says we are authenticated
        if (isAuthenticatedRef.current) {
          try {
            const token = await getTokenRef.current();
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
          } catch (error) {
            console.error("Error attaching token:", error);
          }
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Mark as ready so the app can render
    setIsReady(true);

    // Cleanup
    return () => {
      api.interceptors.request.eject(requestInterceptor);
    };
  }, []); // 👈 Empty dependency array: stable registration

  // 4. Block rendering until Auth0 loads & Interceptor is set
  if (isLoading || !isReady) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  return <>{children}</>;
};

export default AxiosInterceptor;
