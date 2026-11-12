import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// scrypt is built into Node, so no native dependency is needed. Format: scrypt$N$r$p$salt$hash (base64).
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEYLEN, opts, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash to compare against when the user does not exist, so timing does not reveal valid accounts. */
export const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

const COMMON = new Set([
  "password", "password1", "password123", "1234567890", "12345678910", "qwertyuiop", "qwerty12345",
  "iloveyou123", "admin12345", "letmein1234", "welcome1234", "changeme123", "abc1234567",
]);

/** Returns a list of human-readable problems (empty when the password is acceptable). */
export function passwordProblems(password: string, who: { email?: string; username?: string } = {}): string[] {
  const problems: string[] = [];
  if (password.length < 10) problems.push("Password must be at least 10 characters.");
  if (password.length > 256) problems.push("Password is too long.");
  if (/^\d+$/.test(password)) problems.push("Password cannot be entirely numeric.");
  if (COMMON.has(password.toLowerCase())) problems.push("This password is too common.");
  const lower = password.toLowerCase();
  const parts = [who.username, who.email?.split("@")[0]].filter((v): v is string => !!v && v.length >= 4);
  if (parts.some((part) => lower.includes(part.toLowerCase()))) {
    problems.push("Password is too similar to your username or email.");
  }
  return problems;
}
