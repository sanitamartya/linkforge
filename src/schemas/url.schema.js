import { z } from "zod";

export const createUrlSchema = z.strictObject({
  originalUrl: z
    .url({
      protocol: /^https?$/,
      error: "Please provide a valid HTTP or HTTPS URL.",
    })
    .trim(),
});
