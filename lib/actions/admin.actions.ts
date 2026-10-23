"use server";

import { cookies } from "next/headers";
import { allowAuthAttempt } from "../auth-rate-limit";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  cookieOptions,
  createAdminSession,
  isAdmin,
  matchesAdminPasskey,
} from "../auth";

export async function verifyAdminPasskey(passkey: string) {
  try {
    if (typeof passkey !== "string" || !/^\d{6}$/.test(passkey)) return false;
    if (
      !(await allowAuthAttempt("admin", "shared-admin")) ||
      !matchesAdminPasskey(passkey)
    )
      return false;
    (await cookies()).set(ADMIN_COOKIE, createAdminSession(), {
      ...cookieOptions,
      maxAge: ADMIN_SESSION_SECONDS,
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkAdminSession() {
  return isAdmin();
}

export async function logoutAdmin() {
  (await cookies()).delete(ADMIN_COOKIE);
}
