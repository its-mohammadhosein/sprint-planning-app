import { prisma } from "@/lib/db";
import { requireAdminForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { UsersClient } from "@/components/admin/UsersClient";

export default async function AdminUsersPage() {
  const session = await requireAdminForPage("/admin/users");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        jiraUsername: true,
        teamId: true,
        role: true,
        team: { select: { id: true, name: true } },
      },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <AppShell user={user} active="admin">
      <UsersClient initialUsers={users} teams={teams} currentUserId={user.id} />
    </AppShell>
  );
}
