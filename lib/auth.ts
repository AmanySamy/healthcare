import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { Account } from "node-appwrite";
import { cookies } from "next/headers";
import { createAccountClient } from "./appwrite.config";

export const ADMIN_SESSION_SECONDS = 60 * 60;
export const ADMIN_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-carepulse-admin"
    : "carepulse-admin";
export const PATIENT_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-carepulse-patient"
    : "carepulse-patient";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export function matchesAdminPasskey(value: unknown) {
  const expected = process.env.ADMIN_PASSKEY;
  if (
    !expected ||
    !/^\d{6}$/.test(expected) ||
    typeof value !== "string" ||
    !/^\d{6}$/.test(value)
  ) {
    return false;
  }
  return timingSafeEqual(
    createHash("sha256").update(value).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

function sessionSignature(payload: string) {
  const secret = process.env.SESSION_SECRET;
  const passkey = process.env.ADMIN_PASSKEY;
  if (!secret || secret.length < 32 || !passkey) {
    throw new Error("Admin session configuration is incomplete");
  }
  const key = createHmac("sha256", secret).update(passkey).digest();
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function createAdminSession(now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      expiresAt: now + ADMIN_SESSION_SECONDS * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sessionSignature(payload)}`;
}

export function validAdminSession(token: string | undefined, now = Date.now()) {
  if (!token || token.length > 1024) return false;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra !== undefined) return false;
    const expected = Buffer.from(sessionSignature(payload));
    const supplied = Buffer.from(signature);
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    )
      return false;
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    return (
      claims.role === "admin" &&
      Number.isSafeInteger(claims.expiresAt) &&
      claims.expiresAt > now &&
      claims.expiresAt <= now + ADMIN_SESSION_SECONDS * 1000
    );
  } catch {
    return false;
  }
}

export async function isAdmin() {
  return validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}

export async function requirePatient(userId: string) {
  const secret = (await cookies()).get(PATIENT_COOKIE)?.value;
  if (!secret) throw new Error("Unauthorized");
  try {
    const account = await new Account(
      createAccountClient().setSession(secret),
    ).get();
    if (account.$id === userId) return account;
  } catch {
    throw new Error("Unauthorized");
  }
  throw new Error("Unauthorized");
}

export async function requirePatientOrAdmin(userId: string) {
  if (!(await isAdmin())) await requirePatient(userId);
}
