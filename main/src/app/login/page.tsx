import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[380px] rounded-lg border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-text">Sprint Planner</h1>
        <p className="mt-1 text-sm text-muted">Sign in to plan your sprint.</p>

        {params.notice && (
          <p className="mt-4 rounded-md border border-border bg-surface-muted px-3 py-2 text-[13px] text-text-secondary">
            {params.notice}
          </p>
        )}

        <div className="mt-6">
          <LoginForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
