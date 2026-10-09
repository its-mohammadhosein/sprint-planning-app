import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { destroyAllUserSessions } from "@/lib/session";
import { toErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const userId = Number(id);

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await destroyAllUserSessions(userId);

    return NextResponse.json({ tempPassword });
  } catch (error) {
    return toErrorResponse(error);
  }
}
