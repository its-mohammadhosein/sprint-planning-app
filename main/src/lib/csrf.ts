import { ForbiddenError } from "./errors";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function assertSameOrigin(request: Request): void {
  if (!MUTATING_METHODS.has(request.method)) return;

  const origin = request.headers.get("origin");
  const appOrigin = process.env.APP_ORIGIN;

  if (!origin || !appOrigin || origin !== appOrigin) {
    throw new ForbiddenError("Cross-origin request blocked");
  }
}
