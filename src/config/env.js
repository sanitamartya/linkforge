import "dotenv/config";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
  throw new Error(
    "JWT_SECRET must be configured and contain at least 32 bytes.",
  );
}

export const env = {
  jwtSecret,
  appBaseUrl: (process.env.APP_BASE_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  ),
};
