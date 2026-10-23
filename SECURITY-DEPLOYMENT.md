# Netlify Security Migration

## Confirmed Findings

The original checkout had a clean Git diff. It did not contain the described
`verifyAdminPasskey` action, dynamic lookup patch, or `netlify.toml` exclusion.
It read the privileged key through `NEXT_PUBLIC_API_KEY`. Next.js can embed
public environment values into generated server code as well as browser code.
The browser modal directly compared `NEXT_PUBLIC_ADMIN_PASSKEY` and stored a
Base64 copy in localStorage. Admin and patient data actions had no authorization;
patient creation used a fixed password and returned existing users by email.

The reported generated register-page path is consistent with the public key
being substituted into its server dependency graph. The exact matching variable
cannot be confirmed without the original Netlify report and matching artifact.
A generated server file alone does not prove browser exposure. No evidence was
found that identifies Sharp/libvips as the cause. No scanner exclusions or global
scanner disablement have been added.

The new local exact-value scan reproduced matches for the legacy public admin
passkey inside ordinary registration placeholder strings and a polyfill's digit
sequence. These are verified incidental substring matches, including in the
register-page bundle, not evidence of a remaining passkey reference in source.
The obsolete public variable must still be removed and its credential rotated;
excluding the register page or all polyfills would conceal real leaks. The
original Netlify detection can only be tied to these findings after checking its
reported variable name and build revision. The locally configured legacy API key
and Sentry token had no exact matches in the new build. The local scan still
fails on the old passkey; that result has not been suppressed.

All Appwrite access was traced through the two server-action modules and their
server-page/client-form callers. `API_KEY` is private to `getAppwrite`;
database and table IDs feed row operations, and bucket/endpoint/project IDs feed
file operations and document URLs. `DOCTOR_COLLECTION_ID` is currently unused.
The standalone API example does not access Appwrite. No middleware or Appwrite
environment remapping in build configuration exists in this checkout.

## Environment Migration

Use `.env.example` as a names-only template. Never reuse its placeholder values.

| Old Netlify Variable                    | Required Replacement                         | Scope                                   |
| --------------------------------------- | -------------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_API_KEY`                   | `API_KEY`, using a newly issued Appwrite key | Functions/runtime only                  |
| `NEXT_PUBLIC_ADMIN_PASSKEY`             | `ADMIN_PASSKEY`, a new six-digit value       | Functions/runtime only                  |
| `NEXT_PUBLIC_DATABASE_ID`               | `DATABASE_ID`                                | Functions/runtime                       |
| `NEXT_PUBLIC_PATIENT_COLLECTION_ID`     | `PATIENT_COLLECTION_ID`                      | Functions/runtime                       |
| `NEXT_PUBLIC_DOCTOR_COLLECTION_ID`      | `DOCTOR_COLLECTION_ID`                       | Functions/runtime; currently unused     |
| `NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID` | `APPOINTMENT_COLLECTION_ID`                  | Functions/runtime                       |
| `NEXT_PUBLIC_BUCKET_ID`                 | `BUCKET_ID`                                  | Functions/runtime                       |
| `NEXT_PUBLIC_PROJECT_ID`                | Prefer `PROJECT_ID`                          | Functions/runtime                       |
| `NEXT_PUBLIC_ENDPOINT`                  | Prefer `ENDPOINT`                            | Functions/runtime                       |
| `SENTRY_AUTH_TOKEN`                     | Same name                                    | Builds only, never Functions or browser |

Add a cryptographically random `SESSION_SECRET` of at least 32 characters. Add
`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from a shared Upstash Redis
database for durable authentication throttling. These are Functions/runtime
settings, not public values. Authentication intentionally fails closed if Redis
or its configuration is unavailable. The admin limiter permits five attempts
per 15 minutes across all instances; attackers can exhaust that shared limit.
Use an edge firewall rule for additional abuse protection and alerting.

Endpoint, project, database, table/collection, and bucket IDs are identifiers,
not credentials. Only endpoint and project have a compatibility fallback to
their existing public names; no client currently needs environment variables.
Endpoint/project/bucket identifiers can appear in returned document URLs.
An identifier never authorizes access. Keep private buckets and data permissions
restricted; do not grant public access to make document links work.

Set the runtime variables for every deployed context, including previews where
appropriate. Remove the obsolete public names from all contexts, inherited
team settings, build overrides, and local real environment files. Build-only
Sentry token scope and Functions scope must be verified in the Netlify UI.
Check Netlify UI/team `SECRETS_SCAN_*` overrides as well as repository config;
none can be verified remotely from this checkout. Preserve scanning enabled.

## Required Credential Response

1. Issue a new least-privilege API key in Appwrite Console, deploy it under
   `API_KEY`, then revoke the former `NEXT_PUBLIC_API_KEY`. Treat the former
   public-prefixed key as potentially exposed; browser exposure is not assumed
   proven. Inspect Appwrite audit logs and key usage.
2. Replace the old admin passkey in Netlify with a new `ADMIN_PASSKEY`. Previous
   browser bundles/localStorage exposed it. Changing it invalidates the new
   signed admin cookies. Legacy localStorage is removed when the modal mounts.
3. Generate `SESSION_SECRET` yourself in a trusted terminal or secret manager;
   do not send it through chat. Rotate it if exposed to invalidate admin cookies.
4. Existing Appwrite users created with the original fixed password require
   password resets/disablement and session revocation in Appwrite. Email OTP is
   now used for application access; it does not revoke old credentials or
   sessions. Coordinate resets with legitimate users.
5. There is no confirmed Sentry token leak in the code. Revoke/reissue the upload
   token in Sentry if Netlify identifies it, it was committed, or a bundle/log
   inspection shows exposure. Apply the same conditional rotation to Redis
   credentials. The hardcoded Sentry DSN is a public ingestion identifier,
   not `SENTRY_AUTH_TOKEN`.

No rotation or dashboard change has been performed by this code change.

## Authentication And Permissions

Enable Appwrite Email OTP authentication and delivery, configure the deployment
hostname as an allowed platform, and verify email code delivery. First-time and
returning patients use the existing form plus a six-digit email code. The server
issues an HttpOnly, Secure-in-production, SameSite=Strict Appwrite session cookie
only after verification. Data actions check the verified account ID against the
requested user, appointment owner, and patient relation. Administrator operations
require a signed one-hour HttpOnly cookie on every server call, not a boolean
verification result or browser storage.

The server key must have only the users, account-session, table/row, file, and
messaging scopes needed by the SDK calls. Verify actual scopes against your
Appwrite version, existing schema, and private bucket/table permissions. Do not
broaden public ACLs. Private identification-file preview authorization needs
validation against your Appwrite deployment; direct URLs do not grant access.
Test legitimate appointment creation, scheduling/cancellation, SMS delivery,
cross-patient denial, and forged/expired-cookie denial before production use.

Sentry token access is limited to build configuration. Runtime telemetry omits
HTTP bodies, cookies, headers, query parameters, user data, database payloads,
and stack variables. Session replay and patient-name metrics are disabled.

## Verification And Exact Scanner Diagnosis

Run `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test:security`,
`pnpm build`, then `pnpm scan:secrets`. The scan compares configured credential
values without printing them, covers browser/server build output and `.netlify`
when present, and omits caches. Missing configured keys are explicitly reported;
an absent key cannot be tested by that run. This is an exact-value diagnostic,
not a replacement for Netlify's scanner or a complete encoded-secret detector.

For the original failure, obtain the **variable/key name**, exact path and line,
deploy ID, and build commit from Netlify. Do not paste the detected value. Use
`pnpm scan:secrets --all-env` against the corresponding final packaged output to
include public identifiers. Inspect the named match privately: credential,
identifier, literal source credential, or unrelated binary byte sequence. Only a
verified benign match warrants the narrowest specific key/path exclusion. A
Sharp exclusion is unjustified if the only reported path is a page JavaScript
bundle. Never exclude the entire server output or disable scanning.

Clear Netlify build caches after migration and redeploy with scanning enabled.
The fix is deployment-verified only when that build's final packaged artifacts
pass Netlify scanning and the authenticated integration checks pass. Remove old
public deploy artifacts where supported and review prior logs/Sentry events for
credential or health-data exposure. Real `.env*` files and Netlify build output
are Git-ignored; only the placeholder `.env.example` is eligible for tracking.

`pnpm-lock.yaml` is the deployment lockfile. Use pnpm consistently; the pre-existing
`package-lock.json` is not synchronized by pnpm. Ensure Netlify uses pnpm rather
than selecting the stale npm lockfile.
