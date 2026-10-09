import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    await requireUser();
    const users = await prisma.user.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true, teamId: true },
    });
    return NextResponse.json(users);
  } catch (error) {
    return toErrorResponse(error);
  }
}
