"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

type AppUser = User & {
  is_admin?: boolean;
  nickname?: string | null;
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const enrichUser = async (baseUser: User): Promise<AppUser> => {
    const { data: profile } = await supabase
      .from("users_profiles")
      .select("is_admin, nickname")
      .eq("id", baseUser.id)
      .single();

    return {
      ...baseUser,
      is_admin: profile?.is_admin ?? false,
      nickname: profile?.nickname ?? null,
    };
  };

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        const enriched = await enrichUser(session.user);
        if (!isMounted) return;

        setUser(enriched);
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      console.log("[AuthProvider] auth event:", event, {
        email: session?.user?.email ?? null,
        hasSession: Boolean(session),
      });

      if (session?.user) {
        const enriched = await enrichUser(session.user);
        if (!isMounted) return;

        setUser(enriched);
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
