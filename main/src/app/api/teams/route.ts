import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireUser();
    const teams = await prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return NextResponse.json(teams);
  } catch (error) {
    return toErrorResponse(error);
  }
}
