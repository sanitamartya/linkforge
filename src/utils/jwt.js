import { SignJWT, jwtVerify } from "jose";

import { env } from "../config/env.js";

const secretKey = new TextEncoder().encode(env.jwtSecret);

const JWT_ISSUER = "linkforge";
const JWT_AUDIENCE = "linkforge-api";
const ACCESS_TOKEN_EXPIRATION = "15m";

export async function createAccessToken(userId) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(secretKey);
}

export async function verifyAccessToken(token) {
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return payload;
}
