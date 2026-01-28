import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "~/types/user";

interface AuthState {
  user: User | null; // This is your MongoDB user (with credits, etc.)
  isHydrated: boolean;
  setUser: (user: User) => void;
  logoutUser: () => void;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,

      // Just update the user data (called from AuthSync)
      setUser: (user) => set({ user }),

      // Clear local data (Auth0 SDK handles the actual redirect/session clear)
      logoutUser: () => {
        set({ user: null });
        localStorage.removeItem("cf-user-storage");
      },

      setHydrated: (state) => set({ isHydrated: state }),
    }),
    {
      name: "cf-user-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        // No token restoration needed here anymore!
      },
    },
  ),
);
