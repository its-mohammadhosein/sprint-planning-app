import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";

const RESULT_LIMIT = 20;

export async function GET(request: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const teamIdParam = searchParams.get("teamId");
    const teamId = teamIdParam ? Number(teamIdParam) : undefined;

    const where: Prisma.UserWhereInput = q
      ? { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }] }
      : {};

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, teamId: true },
      // Over-fetch when biasing by team so same-team matches aren't pushed
      // out of the result window by the final slice below.
      take: teamId !== undefined ? RESULT_LIMIT * 3 : RESULT_LIMIT,
    });

    if (teamId === undefined) return NextResponse.json(users);

    // Same-team users first, otherwise keep the name-sorted order — this
    // mirrors the old "show people from my team first" select behavior.
    const sorted = [...users].sort((a, b) => {
      const aMatch = a.teamId === teamId ? 0 : 1;
      const bMatch = b.teamId === teamId ? 0 : 1;
      return aMatch - bMatch;
    });

    return NextResponse.json(sorted.slice(0, RESULT_LIMIT));
  } catch (error) {
    return toErrorResponse(error);
  }
}
