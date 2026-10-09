import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { sprintSchema } from "@/lib/validation/admin";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireAdmin();
    const sprints = await prisma.sprint.findMany({
      orderBy: { startDate: "desc" },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json(
      sprints.map((s) => ({
        id: s.id,
        name: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        taskCount: s._count.tasks,
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

    const body = sprintSchema.parse(await request.json());
    const sprint = await prisma.sprint.create({ data: body });

    return NextResponse.json(sprint, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
