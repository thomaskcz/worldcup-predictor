"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const buttonClassName =
  "inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";

const secondaryButtonClassName =
  "inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800";

export function AuthContent() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const urlError = searchParams.get("error");
  const displayError =
    error ??
    (urlError === "sign_in_failed"
      ? "Sign in failed. Please try again."
      : null);

  async function handleSignIn() {
    setError(null);
    setActionLoading(true);

    const { error: signInError } = await signInWithGoogle();

    setActionLoading(false);

    if (signInError) {
      setError(signInError);
    }
  }

  async function handleSignOut() {
    setError(null);
    setActionLoading(true);

    const { error: signOutError } = await signOut();

    setActionLoading(false);

    if (signOutError) {
      setError(signOutError);
    }
  }

  if (loading) {
    return (
      <p className="text-center text-zinc-600 dark:text-zinc-400">
        Loading session...
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      {user ? (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You are signed in
          </p>
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-50">
            {user.email}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={actionLoading}
            className={secondaryButtonClassName}
          >
            {actionLoading ? "Signing out..." : "Sign out"}
          </button>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to access matches and the leaderboard
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={actionLoading}
            className={buttonClassName}
          >
            {actionLoading ? "Redirecting..." : "Sign in with Google"}
          </button>
        </div>
      )}

      {displayError && (
        <p
          role="alert"
          className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}
