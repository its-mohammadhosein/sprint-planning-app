import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redis } from "./redis";
import { SESSION_COOKIE_NAME } from "./constants";

const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS ?? 28800);

export type SessionData = {
  userId: number;
  role: "admin" | "member";
  createdAt: string;
};

export type Session = SessionData & { sessionId: string };

function sessionKey(sessionId: string) {
  return `sess:${sessionId}`;
}

function userSessionsKey(userId: number) {
  return `user_sessions:${userId}`;
}

export async function createSession(user: {
  id: number;
  role: "admin" | "member";
}): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const data: SessionData = {
    userId: user.id,
    role: user.role,
    createdAt: new Date().toISOString(),
  };

  await redis
    .multi()
    .set(sessionKey(sessionId), JSON.stringify(data), "EX", SESSION_TTL_SECONDS)
    .sadd(userSessionsKey(user.id), sessionId)
    .exec();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return sessionId;
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;

  await redis.expire(sessionKey(sessionId), SESSION_TTL_SECONDS);

  const data = JSON.parse(raw) as SessionData;
  return { ...data, sessionId };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    const raw = await redis.get(sessionKey(sessionId));
    if (raw) {
      const data = JSON.parse(raw) as SessionData;
      await redis.srem(userSessionsKey(data.userId), sessionId);
    }
    await redis.del(sessionKey(sessionId));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function destroyAllUserSessions(userId: number): Promise<void> {
  const key = userSessionsKey(userId);
  const sessionIds = await redis.smembers(key);

  if (sessionIds.length > 0) {
    await redis.del(...sessionIds.map(sessionKey));
  }
  await redis.del(key);
}
