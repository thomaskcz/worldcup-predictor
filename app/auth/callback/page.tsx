"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <p className="text-zinc-600 dark:text-zinc-400">Completing sign in...</p>
    </div>
  );
}
