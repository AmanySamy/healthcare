import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, mocks = {}, env = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      module,
      exports: module.exports,
      Buffer,
      process: { env },
      require: (name) =>
        name === "server-only"
          ? {}
          : Object.hasOwn(mocks, name)
            ? mocks[name]
            : require(name),
    },
    { filename: file },
  );
  return module.exports;
}

function authFixture() {
  const jar = new Map();
  const env = {
    ADMIN_PASSKEY: String(1).padStart(6, "0"),
    SESSION_SECRET: randomBytes(32).toString("hex"),
  };
  const cookieStore = {
    get: (name) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name, value) => jar.set(name, value),
    delete: (name) => jar.delete(name),
  };
  const account = { $id: "patient-one", emailVerification: true };
  const auth = load(
    "lib/auth.ts",
    {
      "next/headers": { cookies: async () => cookieStore },
      "./appwrite.config": {
        createAccountClient: () => ({ setSession: () => ({}) }),
      },
      "node-appwrite": {
        Account: class {
          async get() {
            return account;
          }
        },
      },
    },
    env,
  );
  return { auth, env, jar, account, cookieStore };
}

test("admin sessions reject tampering, expiry, extra segments, missing secrets and rotated credentials", () => {
  const { auth, env } = authFixture();
  const now = Date.now();
  const token = auth.createAdminSession(now);
  assert.equal(auth.validAdminSession(token, now), true);
  for (const invalid of [undefined, "", "admin", token + "x", token + ".extra"])
    assert.equal(auth.validAdminSession(invalid, now), false);
  assert.equal(auth.validAdminSession(token, now + 3_600_001), false);
  assert.equal(auth.matchesAdminPasskey(undefined), false);
  assert.equal(auth.matchesAdminPasskey(env.ADMIN_PASSKEY), true);
  assert.equal(auth.matchesAdminPasskey(String(2).padStart(6, "0")), false);
  env.ADMIN_PASSKEY = String(2).padStart(6, "0");
  assert.equal(auth.validAdminSession(token, now), false);
  delete env.SESSION_SECRET;
  assert.equal(auth.validAdminSession(token, now), false);
});

test("patient authorization requires an authenticated account matching the requested owner", async () => {
  const { auth, jar, account } = authFixture();
  await assert.rejects(auth.requirePatient("patient-one"), /Unauthorized/);
  jar.set(auth.PATIENT_COOKIE, "synthetic-session");
  assert.equal((await auth.requirePatient("patient-one")).$id, "patient-one");
  await assert.rejects(auth.requirePatient("patient-two"), /Unauthorized/);
  account.emailVerification = false;
  assert.equal((await auth.requirePatient("patient-one")).$id, "patient-one");
});

test("passkey login fails closed when throttled and returns only a boolean on success", async () => {
  const { auth, env, cookieStore, jar } = authFixture();
  let allowed = false;
  const actions = load(
    "lib/actions/admin.actions.ts",
    {
      "next/headers": { cookies: async () => cookieStore },
      "../auth": auth,
      "../auth-rate-limit": { allowAuthAttempt: async () => allowed },
    },
    env,
  );
  assert.equal(await actions.verifyAdminPasskey(env.ADMIN_PASSKEY), false);
  assert.equal(jar.size, 0);
  allowed = true;
  assert.equal(await actions.verifyAdminPasskey(env.ADMIN_PASSKEY), true);
  assert.equal(await actions.checkAdminSession(), true);
  assert.equal(jar.get(auth.ADMIN_COOKIE).includes(env.ADMIN_PASSKEY), false);
  await actions.logoutAdmin();
  assert.equal(await actions.checkAdminSession(), false);
});

test("every privileged appointment action rejects unauthenticated calls before touching Appwrite", async () => {
  let touched = false;
  const actions = load("lib/actions/appointment.actions.ts", {
    "../auth": {
      requireAdmin: async () => {
        throw new Error("Unauthorized");
      },
      requirePatientOrAdmin: async () => {
        throw new Error("Unauthorized");
      },
    },
    "../appwrite.config": {
      getAppwrite: () => {
        touched = true;
        throw new Error("must not execute");
      },
    },
    "../utils": {},
    "../validation": {},
    "@/types/appwrite.types": {},
    "next/cache": {},
  });
  for (const operation of [
    () => actions.getRecentAppointments(),
    () => actions.sendSMSNotification("user", "message"),
    () => actions.updateAppointment({}),
    () => actions.createAppointment({ userId: "user" }),
    () => actions.getAppointment("appointment", "user"),
  ])
    await assert.rejects(operation(), /Unauthorized/);
  assert.equal(touched, false);
});

test("patient data actions reject unauthenticated calls before touching Appwrite", async () => {
  let touched = false;
  const actions = load("lib/actions/patient.actions.ts", {
    "next/headers": {},
    "../auth": {
      requirePatientOrAdmin: async () => {
        throw new Error("Unauthorized");
      },
    },
    "../appwrite.config": {
      getAppwrite: () => {
        touched = true;
      },
    },
    "../auth-rate-limit": {},
    "../utils": {},
    "../validation": {},
  });
  for (const operation of [
    () => actions.getUser("user"),
    () => actions.getPatient("user"),
    () => actions.registerPatient({ userId: "user" }),
  ])
    await assert.rejects(operation(), /Unauthorized/);
  assert.equal(touched, false);
});

test("shared rate limiting denies Redis errors instead of accepting a timeout", async () => {
  const limiter = load("lib/auth-rate-limit.ts", {
    "@upstash/redis": {
      Redis: {
        fromEnv: () => {
          throw new Error("unavailable");
        },
      },
    },
    "@upstash/ratelimit": { Ratelimit: class {} },
  });
  assert.equal(await limiter.allowAuthAttempt("admin", "shared-admin"), false);
});

test("privileged configuration has a server-only boundary and no public credential fallback", () => {
  const config = readFileSync("lib/appwrite.config.ts", "utf8");
  assert.match(config, /import "server-only"/);
  assert.doesNotMatch(config, /NEXT_PUBLIC_(API_KEY|ADMIN_PASSKEY)|console\./);
  const modal = readFileSync("components/PassKeyModal.tsx", "utf8");
  assert.doesNotMatch(
    modal,
    /NEXT_PUBLIC_ADMIN_PASSKEY|localStorage\.(setItem|getItem)|decryptKey/,
  );
});

test("appointment creation enforces patient ownership and cannot approve itself", async () => {
  let stored;
  let owner = "patient-one";
  const actions = load("lib/actions/appointment.actions.ts", {
    "../auth": { requirePatientOrAdmin: async () => {} },
    "../appwrite.config": {
      getAppwrite: () => ({
        tablesDB: {
          getRow: async () => ({ userId: owner }),
          createRow: async ({ data }) => {
            stored = data;
            return data;
          },
        },
      }),
    },
    "../utils": { parseStringify: (value) => value },
    "../validation": { CreateAppointmentSchema: { parse: (value) => value } },
    "@/types/appwrite.types": {},
    "next/cache": {},
  });
  const request = {
    userId: "patient-one",
    patient: "patient-row",
    primaryPhysician: "Doctor",
    schedule: new Date(),
    reason: "Checkup",
    status: "scheduled",
  };
  await actions.createAppointment(request);
  assert.equal(stored.status, "pending");
  owner = "patient-two";
  stored = undefined;
  await assert.rejects(
    actions.createAppointment(request),
    /Unable to create appointment/,
  );
  assert.equal(stored, undefined);
});

test("appointment retrieval rejects a different stored owner", async () => {
  const actions = load("lib/actions/appointment.actions.ts", {
    "../auth": { requirePatientOrAdmin: async () => {} },
    "../appwrite.config": {
      getAppwrite: () => ({
        tablesDB: { getRow: async () => ({ userId: "patient-two" }) },
      }),
    },
    "../utils": { parseStringify: (value) => value },
    "../validation": {},
    "@/types/appwrite.types": {},
    "next/cache": {},
  });
  await assert.rejects(
    actions.getAppointment("appointment", "patient-one"),
    /Unable to retrieve appointment/,
  );
});
