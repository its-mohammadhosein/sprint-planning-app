import { prisma } from "@/lib/db";
import { requireAdminForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { EpicsClient } from "@/components/admin/EpicsClient";

export default async function AdminEpicsPage() {
  const session = await requireAdminForPage("/admin/epics");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const epics = await prisma.epic.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { tasks: true } } },
  });

  return (
    <AppShell user={user} active="admin">
      <EpicsClient
        initialEpics={epics.map((e) => ({
          id: e.id,
          name: e.name,
          taskCount: e._count.tasks,
        }))}
      />
    </AppShell>
  );
}
