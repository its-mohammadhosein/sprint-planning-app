import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { createTaskSchema, taskListQuerySchema } from "@/lib/validation/task";
import { toErrorResponse } from "@/lib/api-error";
import { TASK_SELECT } from "@/lib/task-select";

export async function GET(request: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const query = taskListQuerySchema.parse(Object.fromEntries(searchParams));

    const where: Prisma.TaskWhereInput = {};

    if (query.sprintId === "backlog") {
      where.sprintId = null;
    } else if (query.sprintId !== undefined) {
      where.sprintId = Number(query.sprintId);
    }
    if (query.teamId !== undefined) where.teamId = query.teamId;
    if (query.assigneeId === "none") where.assigneeId = null;
    else if (query.assigneeId !== undefined) where.assigneeId = query.assigneeId;
    if (query.priority) where.priority = query.priority;
    if (query.epicId === "none") where.epicId = null;
    else if (query.epicId !== undefined) where.epicId = query.epicId;
    if (query.q) where.title = { contains: query.q, mode: "insensitive" };

    const tasks = await prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser();
    assertSameOrigin(request);

    const body = createTaskSchema.parse(await request.json());
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        teamId: body.teamId,
        assigneeId: body.assigneeId ?? null,
        storyPoints: body.storyPoints ?? null,
        priority: body.priority,
        sprintId: body.sprintId ?? null,
        epicId: body.epicId ?? null,
      },
      select: TASK_SELECT,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
