"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("OAuth error:", error);
          alert(error.message);

          router.replace("/auth?error=sign_in_failed");
          return;
        }
      } else {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          console.error("OAuth error:", error);
          console.error("Session", session);
          alert(error.message);

          router.replace("/auth?error=sign_in_failed");
          return;
        }
      }

      router.replace("/");
    }

    completeSignIn();
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <p className="text-zinc-600 dark:text-zinc-400">Completing sign in...</p>
    </div>
  );
}
