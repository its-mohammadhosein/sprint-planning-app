"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Invalid email or password");
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setFormError("Can't reach the server. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-[13px] font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text outline-none focus-visible:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-press mt-1 flex h-10 items-center justify-center rounded-md bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        ) : (
          "Sign in"
        )}
      </button>

      {formError && (
        <p role="alert" className="text-[13px] text-danger">
          {formError}
        </p>
      )}
    </form>
  );
}
