import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validation/auth";
import { assertSameOrigin } from "@/lib/csrf";
import {
  assertLoginNotRateLimited,
  getClientIp,
  recordLoginFailure,
  resetLoginAttempts,
} from "@/lib/rate-limit";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const body = loginSchema.parse(await request.json());
    const ip = getClientIp(request);

    await assertLoginNotRateLimited(body.email, ip);

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const valid = user ? await verifyPassword(body.password, user.passwordHash) : false;

    if (!user || !valid) {
      await recordLoginFailure(body.email, ip);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    await resetLoginAttempts(body.email, ip);
    await createSession({ id: user.id, role: user.role });

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
