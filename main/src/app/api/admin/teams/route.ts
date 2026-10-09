import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { createTeamSchema } from "@/lib/validation/admin";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireAdmin();
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true, tasks: true } } },
    });
    return NextResponse.json(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        userCount: t._count.users,
        taskCount: t._count.tasks,
      }))
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const body = createTeamSchema.parse(await request.json());
    const team = await prisma.team.create({ data: body });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
