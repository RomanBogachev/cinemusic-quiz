import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashAdminPassword(password: string) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyAdminPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function validateAdminPassword(password: string) {
  if (password.length < 8) {
    return "Пароль должен быть не короче 8 символов";
  }
  return null;
}
