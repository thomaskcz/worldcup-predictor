"use client";

import { useAuth } from "@/components/AuthProvider";
import { AuthContent } from "@/app/auth/AuthContent";
import { NicknameEditor } from "@/components/settings/NicknameEditor";

export function SettingsContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <p className="text-center text-zinc-600 dark:text-zinc-400">Loading session...</p>
    );
  }

  return user ? <NicknameEditor /> : <AuthContent />;
}
