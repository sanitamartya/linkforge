import { randomInt } from "node:crypto";

const CHARACTERS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const CODE_LENGTH = 6;

export function generateShortCode() {
  let shortCode = "";

  for (let i = 0; i < CODE_LENGTH; i++) {
    const randomIndex = randomInt(CHARACTERS.length);

    shortCode += CHARACTERS[randomIndex];
  }

  return shortCode;
}
