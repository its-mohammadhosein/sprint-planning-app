import bcrypt from "bcrypt";

export { generateTempPassword, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./temp-password";

const BCRYPT_COST = Number(process.env.BCRYPT_COST ?? 12);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
