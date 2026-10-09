import { prisma } from "@/lib/db";
import { requireAdminForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TeamsClient } from "@/components/admin/TeamsClient";

export default async function AdminTeamsPage() {
  const session = await requireAdminForPage("/admin/teams");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true, tasks: true } } },
  });

  return (
    <AppShell user={user} active="admin">
      <TeamsClient
        initialTeams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          userCount: t._count.users,
          taskCount: t._count.tasks,
        }))}
      />
    </AppShell>
  );
}
