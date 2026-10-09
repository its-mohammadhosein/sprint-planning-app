export const PRIORITY_STYLES = {
  low: { label: "Low", bg: "#F1F5F9", fg: "#334155", dot: "#64748B" },
  medium: { label: "Medium", bg: "#FEF3C7", fg: "#92400E", dot: "#D97706" },
  high: { label: "High", bg: "#FEE2E2", fg: "#991B1B", dot: "#DC2626" },
} as const;
const STYLES = PRIORITY_STYLES;

export type Priority = keyof typeof STYLES;

export function PriorityBadge({ priority }: { priority: Priority }) {
  const style = STYLES[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: style.bg, color: style.fg }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot }} />
      {style.label}
    </span>
  );
}

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];
