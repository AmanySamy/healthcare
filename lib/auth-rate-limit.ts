import "server-only";

import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export async function allowAuthAttempt(scope: string, identity: string) {
  try {
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      prefix: `carepulse:auth:${scope}`,
      timeout: 0,
    });
    const key = createHash("sha256").update(identity).digest("hex");
    return (await limiter.limit(key)).success;
  } catch {
    return false;
  }
}
