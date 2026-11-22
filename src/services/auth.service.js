import bcrypt from "bcryptjs";

import { prisma } from "../config/database.js";

const SALT_ROUNDS = 12;

export async function registerUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  });

  return user;
}
