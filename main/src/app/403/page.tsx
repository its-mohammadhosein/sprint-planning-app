import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center">
        <h1 className="text-xl font-semibold text-text">Not allowed</h1>
        <p className="text-sm text-muted">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Back to Sprint view
        </Link>
      </div>
    </div>
  );
}
