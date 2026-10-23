import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), false, {
  info() {},
  error() {
    throw new Error("Unable to load environment configuration");
  },
});
const credentialNames = [
  "API_KEY",
  "NEXT_PUBLIC_API_KEY",
  "ADMIN_PASSKEY",
  "NEXT_PUBLIC_ADMIN_PASSKEY",
  "SESSION_SECRET",
  "SENTRY_AUTH_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
];
const names = process.argv.includes("--all-env")
  ? [
      ...new Set([
        ...credentialNames,
        "PROJECT_ID",
        "DATABASE_ID",
        "PATIENT_COLLECTION_ID",
        "DOCTOR_COLLECTION_ID",
        "APPOINTMENT_COLLECTION_ID",
        "BUCKET_ID",
        "ENDPOINT",
        ...Object.keys(process.env).filter((name) =>
          name.startsWith("NEXT_PUBLIC_"),
        ),
      ]),
    ]
  : credentialNames;
const values = names
  .filter((name) => process.env[name])
  .map((name) => [name, Buffer.from(process.env[name])]);
console.log(
  `Checking ${values.length} configured ${process.argv.includes("--all-env") ? "environment values (includes public identifiers)" : "credential values"}; values will not be printed.`,
);
for (const name of credentialNames.filter((name) => !process.env[name]))
  console.log(`Not configured locally: ${name}`);
let files = 0;
let findings = 0;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "cache") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.isFile()) {
      files++;
      const content = readFileSync(path);
      for (const [name, value] of values) {
        if (content.includes(value)) {
          findings++;
          console.error(`Match: ${name} in ${relative(process.cwd(), path)}`);
        }
      }
    }
  }
}
const roots = [".next/static", ".next/server", ".netlify"].filter(existsSync);
for (const root of roots) scan(root);
console.log(
  `Scanned ${files} files across ${roots.length} artifact roots; ${findings} matches. No match contents were printed.`,
);
if (!roots.length || !values.length)
  console.log(
    "INCOMPLETE: build artifacts and configured values are both required for a meaningful scan.",
  );
process.exitCode = findings || !roots.length || !values.length ? 1 : 0;
