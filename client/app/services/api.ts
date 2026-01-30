import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 👇 CRITICAL FIX: Treat 422 Clarification as a SUCCESS
    // This stops the global/hook error handlers (and toasters) from firing.
    if (
      error.response?.status === 422 &&
      error.response?.data?.code === "CLARIFICATION_NEEDED"
    ) {
      return Promise.resolve({
        data: error.response.data,
        status: 200, // Spoof status to 200 to pass through Axios checks
        statusText: "OK",
        headers: error.response.headers,
        config: error.config,
      });
    }

    return Promise.reject(error);
  },
);
