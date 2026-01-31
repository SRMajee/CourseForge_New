import { useEffect } from "react";
import { useSocketStore } from "~/store/socketStore";
import { useAuthStore } from "~/store/authStore";

export const useSocketCredits = () => {
  const socket = useSocketStore((state) => state.socket);
  const isConnected = useSocketStore((state) => state.isConnected);

  useEffect(() => {


    if (!socket || !isConnected) return;

    const handleCreditUpdate = (data: {
      credits: number;
      deducted?: number;
    }) => {
      console.log("💰 [Socket] Credit Update Payload:", data);

      // ✅ FIX: Force direct replacement of the credit value.
      // Do not use `state.user.credits + ...` logic.
      // Trust the backend payload as the single source of truth.
      useAuthStore.setState((state) => {
        if (!state.user) return state; // Don't update if no user

        // Return a brand new object to force React re-render
        return {
          ...state,
          user: {
            ...state.user,
            credits: data.credits, // Hard set to the value from backend
          },
        };
      });
    };

    socket.on("credits_updated", handleCreditUpdate);

    return () => {
      socket.off("credits_updated", handleCreditUpdate);
    };
  }, [socket, isConnected]);
};
