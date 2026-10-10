import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";

const RESULT_LIMIT = 20;

export async function GET(request: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    const epics = await prisma.epic.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    });

    return NextResponse.json(epics);
  } catch (error) {
    return toErrorResponse(error);
  }
}
