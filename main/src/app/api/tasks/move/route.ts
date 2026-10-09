import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { moveTasksSchema } from "@/lib/validation/task";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    await requireUser();
    assertSameOrigin(request);

    const body = moveTasksSchema.parse(await request.json());

    const result = await prisma.task.updateMany({
      where: { id: { in: body.taskIds } },
      data: { sprintId: body.sprintId },
    });

    return NextResponse.json({ count: result.count });
  } catch (error) {
    return toErrorResponse(error);
  }
}
