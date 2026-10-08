import { redirect } from "next/navigation";
import { getSession, type Session } from "./session";
import { UnauthorizedError, ForbiddenError } from "./errors";

/** For route handlers: throws, caller converts to a JSON error response. */
export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}

/** For route handlers: throws, caller converts to a JSON error response. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.role !== "admin") {
    throw new ForbiddenError();
  }
  return session;
}

const SESSION_EXPIRED_NOTICE = "Your session expired. Please sign in again.";

/** For protected server components/pages: redirects instead of throwing. */
export async function requireUserForPage(currentPath?: string): Promise<Session> {
  const session = await getSession();
  if (!session) {
    const params = new URLSearchParams({ notice: SESSION_EXPIRED_NOTICE });
    if (currentPath) params.set("next", currentPath);
    redirect(`/login?${params.toString()}`);
  }
  return session;
}

/** For protected admin server components/pages: redirects instead of throwing. */
export async function requireAdminForPage(currentPath?: string): Promise<Session> {
  const session = await requireUserForPage(currentPath);
  if (session.role !== "admin") {
    redirect("/403");
  }
  return session;
}
