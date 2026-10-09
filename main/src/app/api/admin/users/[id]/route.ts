import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { updateUserSchema } from "@/lib/validation/admin";
import { destroyAllUserSessions } from "@/lib/session";
import { toErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  jiraUsername: true,
  teamId: true,
  role: true,
  createdAt: true,
  team: { select: { id: true, name: true } },
} as const;

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const userId = Number(id);
    const body = updateUserSchema.parse(await request.json());

    const existing = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        jiraUsername: body.jiraUsername ?? null,
        teamId: body.teamId ?? null,
        role: body.role,
      },
      select: USER_SELECT,
    });

    if (existing.role !== body.role) {
      await destroyAllUserSessions(userId);
    }

    return NextResponse.json(user);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const userId = Number(id);

    await prisma.user.delete({ where: { id: userId } });
    await destroyAllUserSessions(userId);

    return NextResponse.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
