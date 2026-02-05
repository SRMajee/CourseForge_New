import { auth } from "express-oauth2-jwt-bearer";
import { env } from "../config/env";

export const checkJwt = auth({
  audience: env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${env.AUTH0_DOMAIN}/`,
  tokenSigningAlg: "RS256",
});
