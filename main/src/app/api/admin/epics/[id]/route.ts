import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { updateEpicSchema } from "@/lib/validation/admin";
import { toErrorResponse } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    const body = updateEpicSchema.parse(await request.json());
    const epic = await prisma.epic.update({
      where: { id: Number(id) },
      data: body,
    });

    return NextResponse.json(epic);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    assertSameOrigin(request);

    const { id } = await params;
    // tasks.epic_id is ON DELETE SET NULL — deleting an epic just unlinks its tasks.
    await prisma.epic.delete({ where: { id: Number(id) } });

    return NextResponse.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
