import { prisma } from "@/lib/db";
import { requireUserForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function Home() {
  const session = await requireUserForPage("/");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  return (
    <AppShell user={user} active="sprints">
      <div className="flex flex-col items-center gap-2 py-24 text-center">
        <h1 className="text-xl font-semibold text-text">Sprint Planner</h1>
        <p className="text-sm text-muted">
          Signed in as {user.firstName} {user.lastName} ({session.role})
        </p>
        <p className="text-[13px] text-muted">
          Sprint and Backlog views are built in a later step.
        </p>
      </div>
    </AppShell>
  );
}
