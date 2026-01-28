import axios from "axios";

// Create the Axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1", // Ensure '/v1' is correct
  headers: {
    "Content-Type": "application/json",
  },
});

// NOTE: The Authorization header is injected by AxiosInterceptor.tsx