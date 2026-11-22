import { z } from "zod";

export const registerSchema = z.strictObject({
  email: z.string().trim().toLowerCase().pipe(z.email()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .max(72, "Password must not exceed 72 characters.")
    .refine(
      (password) => new TextEncoder().encode(password).length <= 72,
      "Password must not exceed 72 bytes.",
    ),
});
