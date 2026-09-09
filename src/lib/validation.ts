const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{7,14}$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

const UPPERCASE_RE = /[A-Z]/;
const SPECIAL_RE = /[^A-Za-z0-9]/;

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && UPPERCASE_RE.test(password) && SPECIAL_RE.test(password);
}

export function getPasswordChecks(password: string) {
  return {
    minLength: password.length >= 8,
    uppercase: UPPERCASE_RE.test(password),
    special: SPECIAL_RE.test(password),
  };
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(phone.replace(/\s/g, ''));
}
