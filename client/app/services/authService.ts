import { api } from "./api";
import type { User } from "~/types/user";

export const authService = {
  // Update this function to accept the 'user' object from Auth0
  syncUser: async (auth0User: any): Promise<User> => {
    // We now send the profile in the Request Body
    const { data } = await api.post<User>("/auth/sync", {
      email: auth0User.email,
      name: auth0User.name,
      picture: auth0User.picture,
    });
    return data;
  },

  getProfile: async (): Promise<User> => {
    const { data } = await api.get<User>("/auth/me");
    return data;
  },
};
