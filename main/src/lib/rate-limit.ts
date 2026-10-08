import { redis } from "./redis";
import { TooManyAttemptsError } from "./errors";

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

function key(email: string, ip: string) {
  return `login_attempts:${email.trim().toLowerCase()}:${ip}`;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

export async function assertLoginNotRateLimited(
  email: string,
  ip: string
): Promise<void> {
  const attempts = await redis.get(key(email, ip));
  if (attempts && Number(attempts) >= MAX_ATTEMPTS) {
    throw new TooManyAttemptsError();
  }
}

export async function recordLoginFailure(email: string, ip: string): Promise<void> {
  const k = key(email, ip);
  const count = await redis.incr(k);
  if (count === 1) {
    await redis.expire(k, WINDOW_SECONDS);
  }
}

export async function resetLoginAttempts(email: string, ip: string): Promise<void> {
  await redis.del(key(email, ip));
}
