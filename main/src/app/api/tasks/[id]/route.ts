import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { updateTaskSchema } from "@/lib/validation/task";
import { toErrorResponse } from "@/lib/api-error";
import { TASK_SELECT } from "@/lib/task-select";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireUser();
    assertSameOrigin(request);

    const { id } = await params;
    const body = updateTaskSchema.parse(await request.json());

    const task = await prisma.task.update({
      where: { id: Number(id) },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.teamId !== undefined && { teamId: body.teamId }),
        ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId }),
        ...(body.storyPoints !== undefined && { storyPoints: body.storyPoints }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.sprintId !== undefined && { sprintId: body.sprintId }),
      },
      select: TASK_SELECT,
    });

    return NextResponse.json(task);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireUser();
    assertSameOrigin(request);

    const { id } = await params;
    await prisma.task.delete({ where: { id: Number(id) } });

    return NextResponse.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
