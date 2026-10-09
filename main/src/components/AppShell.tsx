import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNavDropdown } from "./AdminNavDropdown";
import { UserMenu } from "./UserMenu";

export type NavActive = "sprints" | "backlog" | "admin" | null;

export function AppShell({
  user,
  active,
  children,
}: {
  user: { firstName: string; lastName: string; role: "admin" | "member" };
  active: NavActive;
  children: ReactNode;
}) {
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 flex h-14 flex-none items-center justify-between border-b border-border bg-surface px-6">
        <div className="flex h-full items-center gap-6">
          <Link href="/" className="text-base font-semibold text-text hover:no-underline">
            Sprint Planner
          </Link>
          <nav className="flex h-full items-center gap-1">
            <Link
              href="/sprints/current"
              className={`flex h-full items-center border-b-2 px-2.5 text-sm hover:no-underline ${
                active === "sprints"
                  ? "border-b-text font-semibold text-text"
                  : "border-b-transparent font-normal text-text"
              }`}
            >
              Sprints
            </Link>
            <Link
              href="/backlog"
              className={`flex h-full items-center border-b-2 px-2.5 text-sm hover:no-underline ${
                active === "backlog"
                  ? "border-b-text font-semibold text-text"
                  : "border-b-transparent font-normal text-text"
              }`}
            >
              Backlog
            </Link>
            {user.role === "admin" && <AdminNavDropdown active={active === "admin"} />}
          </nav>
        </div>
        <UserMenu fullName={fullName} />
      </header>
      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
