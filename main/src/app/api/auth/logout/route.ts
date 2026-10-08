import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { assertSameOrigin } from "@/lib/csrf";
import { toErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await destroySession();
    return NextResponse.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
