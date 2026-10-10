import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserForPage } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { TaskBoard } from "@/components/task/TaskBoard";
import { SprintPicker } from "@/components/task/SprintPicker";
import { TASK_SELECT } from "@/lib/task-select";
import { getSprintStatus } from "@/lib/sprint-status";
import { taskListQuerySchema } from "@/lib/validation/task";

function formatRange(start: Date, end: Date) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${fmt(start)} - ${fmt(end)}`;
}

export default async function SprintViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const session = await requireUserForPage(`/sprints/${id}`);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });

  const allSprints = await prisma.sprint.findMany({ orderBy: { startDate: "desc" } });
  const currentSprint = allSprints.find((s) => getSprintStatus(s.startDate, s.endDate) === "current");

  if (id === "current") {
    const target = currentSprint ?? allSprints[0];
    if (!target) {
      // No sprints exist yet — fall back to the Backlog so the app stays usable.
      redirect("/backlog");
    }
    redirect(`/sprints/${target.id}`);
  }

  const sprintId = Number(id);
  if (!Number.isInteger(sprintId)) notFound();

  const sprint = allSprints.find((s) => s.id === sprintId);
  if (!sprint) notFound();

  const rawParams = await searchParams;
  const query = taskListQuerySchema.parse(
    Object.fromEntries(Object.entries(rawParams).filter(([, v]) => typeof v === "string"))
  );

  const where: Prisma.TaskWhereInput = { sprintId };
  if (query.teamId !== undefined) where.teamId = query.teamId;
  if (query.assigneeId === "none") where.assigneeId = null;
  else if (query.assigneeId !== undefined) where.assigneeId = query.assigneeId;
  if (query.priority) where.priority = query.priority;
  if (query.epicId === "none") where.epicId = null;
  else if (query.epicId !== undefined) where.epicId = query.epicId;
  if (query.q) where.title = { contains: query.q, mode: "insensitive" };

  const [tasks, totalTaskCountUnfiltered, teamTotals, teams, users, epics] = await Promise.all([
    prisma.task.findMany({ where, select: TASK_SELECT, orderBy: { createdAt: "desc" } }),
    prisma.task.count({ where: { sprintId } }),
    prisma.task.groupBy({
      by: ["teamId"],
      where: { sprintId },
      _sum: { storyPoints: true },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.epic.findMany({ orderBy: { name: "asc" } }),
  ]);

  const teamBreakdown = teamTotals
    .map((t) => ({
      teamName: teams.find((team) => team.id === t.teamId)?.name ?? "Unknown",
      totalST: Number(t._sum.storyPoints ?? 0),
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName));

  const sprintsForClient = allSprints.map((s) => ({
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
    <AppShell user={user} active="sprints">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <SprintPicker sprints={sprintsForClient} currentSprintId={currentSprint?.id ?? null} currentId={sprintId} />
            <span className="text-sm text-muted">{formatRange(sprint.startDate, sprint.endDate)}</span>
          </div>
        </div>

        <TaskBoard
          mode="sprint"
          sprintId={sprintId}
          tasks={tasksForClient}
          totalTaskCountUnfiltered={totalTaskCountUnfiltered}
          teamBreakdown={teamBreakdown}
          teams={teams}
          users={users}
          sprints={sprintsForClient}
          epics={epics}
          basePath={`/sprints/${sprintId}`}
        />
      </div>
    </AppShell>
  );
}
