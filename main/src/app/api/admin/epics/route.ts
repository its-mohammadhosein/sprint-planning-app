import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { createEpicSchema } from "@/lib/validation/admin";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireAdmin();
    const epics = await prisma.epic.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json(
      epics.map((e) => ({
        id: e.id,
        name: e.name,
        taskCount: e._count.tasks,
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

    const body = createEpicSchema.parse(await request.json());
    const epic = await prisma.epic.create({ data: body });

    return NextResponse.json(epic, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
