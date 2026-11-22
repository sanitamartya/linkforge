import bcrypt from "bcryptjs";

import { prisma } from "../config/database.js";
import { createAccessToken } from "../utils/jwt.js";

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

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return null;
  }

  const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordIsValid) {
    return null;
  }

  const accessToken = await createAccessToken(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    accessToken,
  };
}
