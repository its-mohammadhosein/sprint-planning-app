import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TaskBoard } from "@/components/task/TaskBoard";
import { TASK_SELECT } from "@/lib/task-select";
import { taskListQuerySchema } from "@/lib/validation/task";

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUserForPage("/backlog");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const rawParams = await searchParams;
  const query = taskListQuerySchema.parse(
    Object.fromEntries(Object.entries(rawParams).filter(([, v]) => typeof v === "string"))
  );

  const where: Prisma.TaskWhereInput = { sprintId: null };
  if (query.teamId !== undefined) where.teamId = query.teamId;
  if (query.assigneeId === "none") where.assigneeId = null;
  else if (query.assigneeId !== undefined) where.assigneeId = query.assigneeId;
  if (query.priority) where.priority = query.priority;
  if (query.q) where.title = { contains: query.q, mode: "insensitive" };

  const [tasks, totalTaskCountUnfiltered, teamTotals, teams, users, sprints] = await Promise.all([
    prisma.task.findMany({ where, select: TASK_SELECT, orderBy: { createdAt: "desc" } }),
    prisma.task.count({ where: { sprintId: null } }),
    prisma.task.groupBy({
      by: ["teamId"],
      where: { sprintId: null },
      _sum: { storyPoints: true },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.sprint.findMany({ orderBy: { startDate: "desc" } }),
  ]);

  const teamBreakdown = teamTotals
    .map((t) => ({
      teamName: teams.find((team) => team.id === t.teamId)?.name ?? "Unknown",
      totalST: Number(t._sum.storyPoints ?? 0),
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  const sprintsForClient = sprints.map((s) => ({
    id: s.id,
    name: s.name,
    startDate: s.startDate.toISOString(),
    endDate: s.endDate.toISOString(),
  }));
  const tasksForClient = tasks.map((t) => ({
    ...t,
    storyPoints: t.storyPoints === null ? null : Number(t.storyPoints),
  }));

  return (
    <AppShell user={user} active="backlog">
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold text-text">Backlog</h1>
          <span className="rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-secondary">
            {totalTaskCountUnfiltered} {totalTaskCountUnfiltered === 1 ? "task" : "tasks"}
          </span>
        </div>

        <TaskBoard
          mode="backlog"
          sprintId={null}
          tasks={tasksForClient}
          totalTaskCountUnfiltered={totalTaskCountUnfiltered}
          teamBreakdown={teamBreakdown}
          teams={teams}
          users={users}
          sprints={sprintsForClient}
          basePath="/backlog"
        />
      </div>
    </AppShell>
  );
}
