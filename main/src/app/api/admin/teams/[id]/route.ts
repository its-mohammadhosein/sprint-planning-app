import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { updateTeamSchema } from "@/lib/validation/admin";
import { toErrorResponse } from "@/lib/api-error";
import { AppError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const body = updateTeamSchema.parse(await request.json());
    const team = await prisma.team.update({
      where: { id: Number(id) },
      data: body,
    });

    return NextResponse.json(team);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const teamId = Number(id);

    const taskCount = await prisma.task.count({ where: { teamId } });
    if (taskCount > 0) {
      throw new AppError(
        `This team still has ${taskCount} ${taskCount === 1 ? "task" : "tasks"}. Move or delete them first.`,
        409
      );
    }

    await prisma.team.delete({ where: { id: teamId } });
    return NextResponse.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
