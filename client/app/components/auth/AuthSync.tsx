import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef } from "react";
import { useAuthStore } from "~/store/authStore";
import { api } from "~/services/api";

export const AuthSync = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();
  const { setUser } = useAuthStore();

  // Prevent double-firing in Strict Mode
  const isSyncing = useRef(false);

  useEffect(() => {
    const syncUser = async () => {
      // 1. Basic Checks
      if (isLoading || !isAuthenticated || !user || isSyncing.current) return;

      isSyncing.current = true;

      try {
        // 2. 👇 CRITICAL: Ensure we send 'sub' as 'auth0Id'
        const payload = {
          auth0Id: user.sub, // The Auth0 User ID
          email: user.email,
          name: user.name,
          picture: user.picture,
        };

        console.log("📤 Syncing User:", payload); // Debug log

        const { data } = await api.post("/auth/sync", payload);

        setUser(data);
        console.log("✅ User Synced:", data.email);
      } catch (error) {
        console.error("❌ Sync Failed:", error);
        isSyncing.current = false; // Allow retry on failure
      }
    };

    syncUser();
  }, [user, isAuthenticated, isLoading, setUser]);

  return null;
};
