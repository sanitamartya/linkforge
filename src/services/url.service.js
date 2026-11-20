import { prisma } from "../config/database.js";
import { generateShortCode } from "../utils/short-code.js";

const MAX_RETRIES = 5;

export async function createUrl(originalUrl) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const shortCode = generateShortCode();

    try {
      const url = await prisma.url.create({
        data: {
          originalUrl,
          shortCode,
        },
      });

      return url;
    } catch (error) {
      // Retry only when the short code conflicts
      // with an existing database record.
      if (error.code === "P2002" && attempt < MAX_RETRIES) {
        continue;
      }

      if (error.code === "P2002") {
        throw new Error(
          "Unable to generate a unique short code. Please try again.",
        );
      }

      throw error;
    }
  }
}

export async function getUrlByShortCode(shortCode) {
  return prisma.url.findUnique({
    where: {
      shortCode,
    },
  });
}
