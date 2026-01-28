import { User } from "../models/User";
import axios from "axios";
import { env } from "../config/env";

export const syncUserWithAuth0 = async (
  accessToken: string,
  auth0Id: string,
) => {
  try {
    // 1. Fetch User Profile from Auth0
    // We need this because the Access Token might not have email/picture by default
    const userInfoResponse = await axios.get(
      `https://${env.AUTH0_DOMAIN}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const profile = userInfoResponse.data;

    // 2. Find or Create in MongoDB
    // We use findOneAndUpdate with upsert to handle race conditions cleanly
    const user = await User.findOneAndUpdate(
      { auth0Id: auth0Id }, // Search by Auth0 ID (stable)
      {
        $set: {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          // If we haven't set an ID before, set it now.
          // If the user previously logged in via Google-Auth-Library,
          // you might need a migration script or handle email linking here.
        },
        $setOnInsert: {
          credits: 5, // Only set credits on creation
          createdAt: new Date(),
        },
      },
      { new: true, upsert: true }, // Return new doc, create if missing
    );

    return user;
  } catch (error) {
    console.error("Error syncing user with Auth0:", error);
    throw new Error("Failed to sync user identity");
  }
};
