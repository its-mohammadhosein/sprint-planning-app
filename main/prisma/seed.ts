import { PrismaClient, TaskPriority } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_COST = Number(process.env.BCRYPT_COST ?? 12);

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seeding is not allowed in production.");
  }

  const teamNames = ["Front-end", "Back-end", "PC", "Security"];
  const teams = await Promise.all(
    teamNames.map((name) =>
      prisma.team.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const [frontend, backend, pc, security] = teams;

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const adminPasswordHash = await bcrypt.hash(adminPassword, BCRYPT_COST);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      firstName: "Admin",
      lastName: "User",
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: "admin",
      teamId: backend.id,
    },
  });

  const samplePassword = await bcrypt.hash("Password123!", BCRYPT_COST);
  const sampleUsers = [
    { firstName: "Alice", lastName: "Nguyen", team: frontend, jira: "anguyen" },
    { firstName: "Ben", lastName: "Carter", team: frontend, jira: "bcarter" },
    { firstName: "Chloe", lastName: "Dubois", team: backend, jira: "cdubois" },
    { firstName: "Daniel", lastName: "Kim", team: backend, jira: "dkim" },
    { firstName: "Elena", lastName: "Petrova", team: pc, jira: "epetrova" },
    { firstName: "Farid", lastName: "Haidari", team: pc, jira: null },
    { firstName: "Grace", lastName: "Lee", team: security, jira: "glee" },
    { firstName: "Hassan", lastName: "Ali", team: security, jira: null },
  ];

  const users = [];
  for (const u of sampleUsers) {
    const email = `${u.firstName.toLowerCase()}.${u.lastName.toLowerCase()}@example.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        firstName: u.firstName,
        lastName: u.lastName,
        email,
        passwordHash: samplePassword,
        role: "member",
        jiraUsername: u.jira,
        teamId: u.team.id,
      },
    });
    users.push(user);
  }

  const today = new Date();
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  const sprintDefs = [
    { name: "Sprint 1", startDate: daysFromNow(-21), endDate: daysFromNow(-8) },
    { name: "Sprint 2", startDate: daysFromNow(-7), endDate: daysFromNow(6) },
    { name: "Sprint 3", startDate: daysFromNow(7), endDate: daysFromNow(20) },
  ];

  const sprints = [];
  for (const s of sprintDefs) {
    const sprint = await prisma.sprint.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
    sprints.push(sprint);
  }
  const [sprint1, sprint2, sprint3] = sprints;

  const epicNames = ["Onboarding revamp", "Reporting v2", "Platform hardening"];
  const epics = await Promise.all(
    epicNames.map((name) => prisma.epic.upsert({ where: { name }, update: {}, create: { name } }))
  );

  const priorities: TaskPriority[] = ["low", "medium", "high"];
  const allTeams = [frontend, backend, pc, security];

  const taskTitles = [
    "Set up CI pipeline",
    "Fix login redirect bug",
    "Design task table layout",
    "Add Excel import template",
    "Write Jira export tests",
    "Refactor session middleware",
    "Investigate Redis TTL edge case",
    "Add team filter to backlog",
    "Improve error toast styling",
    "Audit password reset flow",
    "Add sprint date validation",
    "Optimize task list query",
    "Add dark mode styles",
    "Write onboarding docs",
    "Fix CSV BOM encoding issue",
    "Add bulk move to sprint action",
    "Patch dependency vulnerabilities",
    "Add unit tests for Zod schemas",
    "Review admin permissions",
    "Add loading skeletons",
    "Fix table sort persistence",
    "Add column mapping UI",
    "Clean up unused components",
    "Add rate limiting to login",
    "Improve mobile table scroll",
    "Add empty state illustrations",
    "Fix sprint dropdown overflow",
    "Add task description panel",
    "Verify CSRF origin checks",
    "Add seed script safeguards",
  ];

  for (let i = 0; i < taskTitles.length; i++) {
    const team = allTeams[i % allTeams.length];
    const assignee = users[i % users.length];
    const priority = priorities[i % priorities.length];
    const sprint = i % 5 === 0 ? null : [sprint1, sprint2, sprint3][i % 3];
    const epic = i % 3 === 0 ? null : epics[i % epics.length];

    await prisma.task.create({
      data: {
        title: taskTitles[i],
        description: `Details for "${taskTitles[i]}".`,
        storyPoints: [1, 2, 3, 5, 8][i % 5],
        priority,
        assigneeId: i % 7 === 0 ? null : assignee.id,
        teamId: team.id,
        sprintId: sprint?.id ?? null,
        epicId: epic?.id ?? null,
      },
    });
  }

  console.log(`Seeded: ${teams.length} teams, ${users.length + 1} users, ${sprints.length} sprints, ${epics.length} epics, ${taskTitles.length} tasks.`);
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
  void admin;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
