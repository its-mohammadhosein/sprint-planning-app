import ExcelJS from "exceljs";
import { AppError } from "./errors";

export const IMPORT_FIELDS = ["title", "description", "team", "assignee", "st", "priority"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];

export const IMPORT_FIELD_LABELS: Record<ImportField, string> = {
  title: "Title",
  description: "Description",
  team: "Team",
  assignee: "Assignee",
  st: "ST",
  priority: "Priority",
};

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 2000;

/** Field -> 1-based column index in the worksheet (or null if unmapped). */
export type ColumnMapping = Partial<Record<ImportField, number | null>>;

export type ParsedValidRow = {
  rowNumber: number;
  title: string;
  description: string | null;
  teamId: number;
  teamName: string;
  assigneeId: number | null;
  assigneeName: string | null;
  storyPoints: number | null;
  priority: "low" | "medium" | "high";
};

export type ParsedErrorRow = {
  rowNumber: number;
  title: string;
  error: string;
};

type TeamLookup = { id: number; name: string };
type UserLookup = { id: number; firstName: string; lastName: string; email: string };

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new AppError("The file has no worksheet", 400);
  return sheet;
}

function cellText(row: ExcelJS.Row, col: number | null | undefined): string {
  if (!col) return "";
  const raw = row.getCell(col).value;
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === "object") {
    const obj = raw as unknown as Record<string, unknown>;
    if (Array.isArray(obj.richText)) {
      return (obj.richText as { text: string }[]).map((t) => t.text).join("").trim();
    }
    if ("result" in obj) return String(obj.result ?? "").trim();
    if ("text" in obj) return String(obj.text ?? "").trim();
  }
  return String(raw).trim();
}

export async function readWorkbookHeaders(buffer: Buffer): Promise<string[]> {
  const sheet = await loadWorkbook(buffer);
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });
  return headers;
}

export function guessColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const field of IMPORT_FIELDS) {
    const label = IMPORT_FIELD_LABELS[field].toLowerCase();
    const idx = headers.findIndex((h) => h.toLowerCase() === label);
    mapping[field] = idx === -1 ? null : idx + 1;
  }
  return mapping;
}

export async function parseWorkbookRows(
  buffer: Buffer,
  mapping: ColumnMapping,
  lookups: { teams: TeamLookup[]; users: UserLookup[] }
): Promise<{ validRows: ParsedValidRow[]; errorRows: ParsedErrorRow[]; totalRows: number }> {
  const sheet = await loadWorkbook(buffer);

  const dataRowCount = Math.max(0, sheet.actualRowCount - 1);
  if (dataRowCount > MAX_ROWS) {
    throw new AppError(`File has ${dataRowCount} rows; the max is ${MAX_ROWS}`, 400);
  }

  const teamByName = new Map(lookups.teams.map((t) => [t.name.toLowerCase(), t]));
  const userByKey = new Map<string, UserLookup>();
  for (const u of lookups.users) {
    userByKey.set(`${u.firstName} ${u.lastName}`.toLowerCase(), u);
    userByKey.set(u.email.toLowerCase(), u);
  }

  const validRows: ParsedValidRow[] = [];
  const errorRows: ParsedErrorRow[] = [];

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (row.cellCount === 0) continue;

    const titleRaw = cellText(row, mapping.title);
    const descRaw = cellText(row, mapping.description);
    const teamRaw = cellText(row, mapping.team);
    const assigneeRaw = cellText(row, mapping.assignee);
    const stRaw = cellText(row, mapping.st);
    const priorityRaw = cellText(row, mapping.priority);

    if (!titleRaw && !descRaw && !teamRaw && !assigneeRaw && !stRaw && !priorityRaw) continue;

    if (!titleRaw) {
      errorRows.push({ rowNumber: r, title: "(blank)", error: "Title is required" });
      continue;
    }

    const team = teamByName.get(teamRaw.toLowerCase());
    if (!team) {
      errorRows.push({ rowNumber: r, title: titleRaw, error: `Unknown team "${teamRaw}"` });
      continue;
    }

    let assigneeId: number | null = null;
    let assigneeName: string | null = null;
    if (assigneeRaw) {
      const user = userByKey.get(assigneeRaw.toLowerCase());
      if (!user) {
        errorRows.push({ rowNumber: r, title: titleRaw, error: `Unknown assignee "${assigneeRaw}"` });
        continue;
      }
      assigneeId = user.id;
      assigneeName = `${user.firstName} ${user.lastName}`;
    }

    let storyPoints: number | null = null;
    if (stRaw) {
      const n = Number(stRaw);
      if (!Number.isFinite(n) || n < 0) {
        errorRows.push({ rowNumber: r, title: titleRaw, error: "ST must be a number ≥ 0" });
        continue;
      }
      storyPoints = n;
    }

    let priority: "low" | "medium" | "high" = "medium";
    if (priorityRaw) {
      const p = priorityRaw.toLowerCase();
      if (p !== "low" && p !== "medium" && p !== "high") {
        errorRows.push({ rowNumber: r, title: titleRaw, error: "Priority must be low, medium, or high" });
        continue;
      }
      priority = p;
    }

    validRows.push({
      rowNumber: r,
      title: titleRaw,
      description: descRaw || null,
      teamId: team.id,
      teamName: team.name,
      assigneeId,
      assigneeName,
      storyPoints,
      priority,
    });
  }

  return { validRows, errorRows, totalRows: validRows.length + errorRows.length };
}

const TEMPLATE_SAMPLE_ROW = ["Fix login bug", "Users can't log in with SSO", "Back-end", "jane@example.com", "3", "high"];

export async function buildTemplateWorkbookBuffer(): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Tasks");
  sheet.addRow(IMPORT_FIELDS.map((f) => IMPORT_FIELD_LABELS[f]));
  sheet.addRow(TEMPLATE_SAMPLE_ROW);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((col) => {
    col.width = 22;
  });
  return workbook.xlsx.writeBuffer();
}
