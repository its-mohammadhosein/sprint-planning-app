import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUserForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function ForbiddenPage() {
  const session = await requireUserForPage("/403");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <AppShell user={user} active={null}>
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">403</p>
        <h1 className="text-xl font-semibold text-text">Not allowed</h1>
        <p className="max-w-sm text-sm text-muted">
          Only admins can manage teams, users and sprints. Ask an admin if you need
          access.
        </p>
        <Link
          href="/"
          className="mt-3 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-muted"
        >
          Back to Sprint view
        </Link>
      </div>
    </AppShell>
  );
}
