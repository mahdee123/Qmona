/**
 * Create (or update) a staff account from the command line. There is no public registration and no default admin.
 *
 *   npm run create-admin -- --email you@example.com --username you [--role super_admin] [--first-name A] [--last-name B]
 *
 * The password is never passed on the command line. It is taken from, in order:
 *   1. the QMONA_ADMIN_PASSWORD environment variable,
 *   2. --generate --password-file <path>   (a random password is written to that file, readable only by you),
 *   3. an interactive prompt (input is hidden).
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { hashPassword } from "../src/modules/user/password.js";
import { ROLES, type Role } from "../src/modules/user/user.interface.js";
import { User } from "../src/modules/user/user.model.js";
import { assertStrongPassword } from "../src/modules/user/user.service.js";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    process.stdout.write(question);
    // Hide what is typed.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => undefined;
    rl.question("", (answer) => {
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = write;
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function obtainPassword(): Promise<string> {
  if (process.env.QMONA_ADMIN_PASSWORD) return process.env.QMONA_ADMIN_PASSWORD;
  if (flag("generate")) {
    const file = arg("password-file");
    if (!file) throw new Error("--generate needs --password-file <path> (the password is written there, never printed).");
    const password = randomBytes(18).toString("base64url");
    writeFileSync(file, `${password}\n`, { mode: 0o600, flag: "wx" });
    console.log(`A random password was written to ${file}. Read it once, then delete the file.`);
    return password;
  }
  const first = await promptHidden("Password: ");
  if (first !== (await promptHidden("Password (again): "))) throw new Error("Passwords do not match.");
  return first;
}

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const username = arg("username")?.trim();
  const role = (arg("role") ?? "super_admin") as Role;
  if (!email || !username) throw new Error("Usage: create-admin --email <email> --username <name> [--role super_admin|content_editor|inquiry_manager] [--update]");
  if (!ROLES.includes(role)) throw new Error(`Role must be one of: ${ROLES.join(", ")}`);

  await connectDatabase();
  const existing = (await User.findOne({ email })) ?? (await User.findOne({ username }));
  if (existing && !flag("update")) throw new Error(`User ${existing.email} already exists. Use --update to change it.`);

  const password = await obtainPassword();
  assertStrongPassword(password, { email, username });

  const user = existing ?? new User({ email, username });
  user.first_name = arg("first-name") ?? user.first_name ?? "";
  user.last_name = arg("last-name") ?? user.last_name ?? "";
  user.role = role;
  user.is_active = true;
  user.password_hash = await hashPassword(password);
  await user.save();
  console.log(`${existing ? "Updated" : "Created"} ${user.email} with role ${role}.`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
