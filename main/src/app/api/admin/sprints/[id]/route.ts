import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { sprintSchema } from "@/lib/validation/admin";
import { toErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const body = sprintSchema.parse(await request.json());
    const sprint = await prisma.sprint.update({
      where: { id: Number(id) },
      data: body,
    });

    return NextResponse.json(sprint);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    // tasks.sprint_id is ON DELETE SET NULL — deleting a sprint moves its tasks to the Backlog.
    await prisma.sprint.delete({ where: { id: Number(id) } });

    return NextResponse.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
