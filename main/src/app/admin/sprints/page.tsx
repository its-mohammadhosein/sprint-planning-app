import { prisma } from "@/lib/db";
import { requireAdminForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { SprintsClient } from "@/components/admin/SprintsClient";

export default async function AdminSprintsPage() {
  const session = await requireAdminForPage("/admin/sprints");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const sprints = await prisma.sprint.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <AppShell user={user} active="admin">
      <SprintsClient
        initialSprints={sprints.map((s) => ({
          id: s.id,
          name: s.name,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate.toISOString(),
          taskCount: s._count.tasks,
        }))}
      />
    </AppShell>
  );
}
