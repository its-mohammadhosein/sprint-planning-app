import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/api-error";
import { buildTemplateWorkbookBuffer } from "@/lib/import-excel";

export async function GET() {
  try {
    await requireUser();

    const buffer = await buildTemplateWorkbookBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="task-import-template.xlsx"',
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
