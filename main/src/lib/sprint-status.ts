export type SprintStatus = "past" | "current" | "upcoming";

/** DATE columns come back as UTC-midnight Dates; compare by UTC calendar day only. */
function utcDayNumber(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function getSprintStatus(
  startDate: Date,
  endDate: Date,
  today: Date = new Date()
): SprintStatus {
  const todayDay = utcDayNumber(today);
  if (utcDayNumber(endDate) < todayDay) return "past";
  if (utcDayNumber(startDate) > todayDay) return "upcoming";
  return "current";
}

export const SPRINT_STATUS_STYLES: Record<
  SprintStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  past: { label: "Past", bg: "#F1F5F9", fg: "#334155", dot: "#94A3B8" },
  current: { label: "Current", bg: "#DBEAFE", fg: "#1E40AF", dot: "#2563EB" },
  upcoming: { label: "Upcoming", bg: "#DCFCE7", fg: "#166534", dot: "#16A34A" },
};
