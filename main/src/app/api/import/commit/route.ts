import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { importCommitSchema } from "@/lib/validation/import";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    await requireUser();
    assertSameOrigin(request);

    const body = importCommitSchema.parse(await request.json());

    const result = await prisma.task.createMany({
      data: body.rows.map((row) => ({
        title: row.title,
        description: row.description ?? null,
        teamId: row.teamId,
        assigneeId: row.assigneeId ?? null,
        storyPoints: row.storyPoints ?? null,
        priority: row.priority,
        sprintId: body.sprintId,
      })),
    });

    return NextResponse.json({ count: result.count }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
