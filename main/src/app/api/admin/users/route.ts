import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { createUserSchema } from "@/lib/validation/admin";
import { hashPassword } from "@/lib/password";
import { toErrorResponse } from "@/lib/api-error";

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

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: USER_SELECT,
    });
    return NextResponse.json(users);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const body = createUserSchema.parse(await request.json());
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        jiraUsername: body.jiraUsername ?? null,
        teamId: body.teamId ?? null,
        role: body.role,
        passwordHash,
      },
      select: USER_SELECT,
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
