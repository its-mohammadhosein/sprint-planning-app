import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertSameOrigin } from "@/lib/csrf";
import { AppError } from "@/lib/errors";
import { toErrorResponse } from "@/lib/api-error";
import { importMappingSchema } from "@/lib/validation/import";
import {
  guessColumnMapping,
  parseWorkbookRows,
  readWorkbookHeaders,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/import-excel";

export async function POST(request: Request) {
  try {
    await requireUser();
    assertSameOrigin(request);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("No file uploaded", 400);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new AppError("File is larger than 5 MB", 400);
    }

    const mappingRaw = formData.get("mapping");
    const requestedMapping = mappingRaw ? importMappingSchema.parse(JSON.parse(String(mappingRaw))) : null;

    const buffer = Buffer.from(await file.arrayBuffer());
    const headers = await readWorkbookHeaders(buffer);
    const mapping = requestedMapping ?? guessColumnMapping(headers);

    const [teams, users] = await Promise.all([
      prisma.team.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({ select: { id: true, firstName: true, lastName: true, email: true } }),
    ]);

    const { validRows, errorRows, totalRows } = await parseWorkbookRows(buffer, mapping, { teams, users });

    return NextResponse.json({ headers, mapping, validRows, errorRows, totalRows });
  } catch (error) {
    return toErrorResponse(error);
  }
}
