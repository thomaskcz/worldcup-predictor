"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      if (pathname !== "/settings") {
        router.replace("/settings");
      }
      return;
    }

    if (pathname === "/settings") {
      setProfileChecked(true);
      return;
    }

    const checkNickname = async () => {
      try {
        const response = await fetch("/api/user/nickname");
        const json = await response.json();

        if (!json.success || !json.profile?.nickname) {
          router.replace("/settings");
          return;
        }
      } catch (error) {
        console.error("Failed to verify nickname:", error);
      } finally {
        setProfileChecked(true);
      }
    };

    checkNickname();
  }, [loading, user, pathname, router]);

  if (loading || (user && pathname !== "/settings" && !profileChecked)) {
    return (
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-zinc-600 dark:text-zinc-400">Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
