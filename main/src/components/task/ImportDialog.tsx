"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/Dialog";
import { useToast } from "@/components/ToastProvider";
import {
  IMPORT_FIELDS,
  IMPORT_FIELD_LABELS,
  type ColumnMapping,
  type ParsedErrorRow,
  type ParsedValidRow,
} from "@/lib/import-excel";

type Sprint = { id: number; name: string };

type PreviewResult = {
  headers: string[];
  mapping: ColumnMapping;
  validRows: ParsedValidRow[];
  errorRows: ParsedErrorRow[];
  totalRows: number;
};

export function ImportDialog({
  open,
  onClose,
  sprints,
  defaultSprintId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  sprints: Sprint[];
  defaultSprintId: number | null;
  onImported?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const [targetSprintId, setTargetSprintId] = useState<number | null>(defaultSprintId);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setMapping(null);
    setPreview(null);
    setShowMapping(false);
    setTargetSprintId(defaultSprintId);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, defaultSprintId]);

  async function runPreview(fileArg: File, mappingArg: ColumnMapping | null) {
    setLoadingPreview(true);
    setFileError(null);

    try {
      const formData = new FormData();
      formData.append("file", fileArg);
      if (mappingArg) formData.append("mapping", JSON.stringify(mappingArg));

      const res = await fetch("/api/import/preview", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setPreview(null);
        setFileError(data.error ?? "Couldn't read that file");
        return;
      }

      setPreview(data);
      setMapping(data.mapping);
      if (data.mapping.title === null || data.mapping.team === null) {
        setShowMapping(true);
      }
    } catch {
      setPreview(null);
      setFileError("Can't reach the server. Try again.");
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setMapping(null);
    setShowMapping(false);
    if (selected) void runPreview(selected, null);
  }

  function handleMappingChange(field: (typeof IMPORT_FIELDS)[number], value: string) {
    if (!file || !mapping) return;
    const nextMapping: ColumnMapping = { ...mapping, [field]: value ? Number(value) : null };
    setMapping(nextMapping);
    void runPreview(file, nextMapping);
  }

  async function handleCommit() {
    if (!preview || preview.validRows.length === 0) return;
    setCommitting(true);

    try {
      const res = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprintId: targetSprintId, rows: preview.validRows }),
      });
      const data = await res.json();

      if (!res.ok) {
        showToast({ message: data.error ?? "Something went wrong", kind: "error" });
        return;
      }

      showToast({ message: `Imported ${data.count} ${data.count === 1 ? "task" : "tasks"}` });
      onImported?.();
      onClose();
      router.refresh();
    } catch {
      showToast({ message: "Can't reach the server. Try again.", kind: "error" });
    } finally {
      setCommitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Import from Excel" widthClassName="max-w-[760px]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="text-sm text-text"
          />
          <a
            href="/api/import/template"
            className="btn-press flex-none text-sm font-medium text-primary transition-colors hover:text-primary-hover"
          >
            Download template
          </a>
        </div>

        {fileError && <p className="text-[13px] text-danger">{fileError}</p>}
        {loadingPreview && <p className="text-sm text-muted">Validating…</p>}

        {preview && (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text">
                <span className="font-medium">{preview.validRows.length}</span> valid
                {preview.errorRows.length > 0 && (
                  <>
                    {" "}
                    · <span className="font-medium text-danger">{preview.errorRows.length}</span> with errors
                    (skipped)
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowMapping((v) => !v)}
                className="btn-press flex-none text-sm font-medium text-primary transition-colors hover:text-primary-hover"
              >
                {showMapping ? "Hide column mapping" : "Edit column mapping"}
              </button>
            </div>

            {showMapping && mapping && (
              <div className="grid grid-cols-2 gap-3 rounded-md border border-border p-3 sm:grid-cols-3">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field} className="flex flex-col gap-1">
                    <label className="text-[13px] font-medium text-text">
                      {IMPORT_FIELD_LABELS[field]}
                      {(field === "title" || field === "team") && <span className="text-danger"> *</span>}
                    </label>
                    <select
                      value={mapping[field] ?? ""}
                      onChange={(e) => handleMappingChange(field, e.target.value)}
                      className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus-visible:border-primary"
                    >
                      <option value="">Not mapped</option>
                      {preview.headers.map((h, i) => (
                        <option key={i} value={i + 1}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {preview.errorRows.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border border-danger-tint-border bg-danger-tint">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="text-muted">
                      <th className="px-3 py-1.5 font-medium">Row</th>
                      <th className="px-3 py-1.5 font-medium">Title</th>
                      <th className="px-3 py-1.5 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.errorRows.map((row) => (
                      <tr key={row.rowNumber}>
                        <td className="px-3 py-1 tabular-nums text-muted">{row.rowNumber}</td>
                        <td className="px-3 py-1 text-text">{row.title}</td>
                        <td className="px-3 py-1 text-danger">{row.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.validRows.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-md border border-border">
                <table className="w-full text-left text-[13px]">
                  <thead className="sticky top-0 bg-surface-muted text-muted">
                    <tr>
                      <th className="px-3 py-1.5 font-medium">Row</th>
                      <th className="px-3 py-1.5 font-medium">Title</th>
                      <th className="px-3 py-1.5 font-medium">Team</th>
                      <th className="px-3 py-1.5 font-medium">Assignee</th>
                      <th className="px-3 py-1.5 font-medium text-right">ST</th>
                      <th className="px-3 py-1.5 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.validRows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-border">
                        <td className="px-3 py-1 tabular-nums text-muted">{row.rowNumber}</td>
                        <td className="px-3 py-1 text-text">{row.title}</td>
                        <td className="px-3 py-1 text-text">{row.teamName}</td>
                        <td className="px-3 py-1 text-text">{row.assigneeName ?? "Unassigned"}</td>
                        <td className="px-3 py-1 text-right tabular-nums text-text">
                          {row.storyPoints ?? "—"}
                        </td>
                        <td className="px-3 py-1 text-text capitalize">{row.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label htmlFor="import-target" className="text-[13px] font-medium text-text">
                Import into
              </label>
              <select
                id="import-target"
                value={targetSprintId ?? ""}
                onChange={(e) => setTargetSprintId(e.target.value ? Number(e.target.value) : null)}
                className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text outline-none focus-visible:border-primary"
              >
                <option value="">Backlog</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-press rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={!preview || preview.validRows.length === 0 || committing}
            className="btn-press rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            {committing ? "Importing…" : preview ? `Import ${preview.validRows.length} tasks` : "Import"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
