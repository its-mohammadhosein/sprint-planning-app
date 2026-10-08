import { prisma } from "@/lib/db";
import { requireUserForPage } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export default async function Home() {
  const session = await requireUserForPage("/");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold text-text">Sprint Planner</h1>
        <p className="text-sm text-muted">
          Signed in as {user?.firstName} {user?.lastName} ({session.role})
        </p>
        <p className="text-[13px] text-muted">
          Sprint and Backlog views are built in a later step.
        </p>
        <SignOutButton />
      </div>
    </div>
  );
}
