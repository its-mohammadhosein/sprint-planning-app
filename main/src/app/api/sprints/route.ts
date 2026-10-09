import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireUser();
    const sprints = await prisma.sprint.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    });
    return NextResponse.json(sprints);
  } catch (error) {
    return toErrorResponse(error);
  }
}
