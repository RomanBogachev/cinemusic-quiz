import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function normalizeAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeAdminUsername(username: string) {
  return username.trim();
}

export function validateAdminUsername(username: string) {
  if (!username) {
    return "Введите имя пользователя";
  }
  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    return "Имя пользователя должно содержать 3-32 символа: латиница, цифры, точка, дефис или подчёркивание";
  }
  return null;
}

export function validateOptionalAdminEmail(email: string | null) {
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Введите корректный email или оставьте поле пустым";
  }
  return null;
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
