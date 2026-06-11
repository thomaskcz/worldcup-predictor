"use client";

import { useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageContainer } from "@/components/PageContainer";
import { MatchManagement } from "@/components/admin/MatchManagement";
import { LiveMatches } from "@/components/admin/LiveMatches";
import { UserPredictionTracking } from "@/components/admin/UserPredictionTracking";
import {useAuth} from "@/components/AuthProvider";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"live" | "management" | "tracking">("live");

  if (loading || !user || !user.is_admin) {
    return (
          <PageContainer title="Admin" description="Tu sais pas lire ? C'est écrit admin et je crois pas que t'en sois un alors passe ton chemin."/>
    );
  }

  return (
    <AdminGuard>
      <PageContainer title="Admin" description="Gérer les matchs et les scores.">
        <div className="space-y-6">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
                onClick={() => setActiveTab("live")}
                className={`px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                    activeTab === "live"
                        ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-600 hover:text-zinc-900 hover:border-b-2 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:border-zinc-700"
                }`}
            >
              🔴 Matchs en direct
            </button>
            <button
              onClick={() => setActiveTab("management")}
              className={`px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === "management"
                  ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-600 hover:text-zinc-900 hover:border-b-2 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:border-zinc-700"
              }`}
            >
              ⚙️ Gestion des matchs
            </button>
            <button
              onClick={() => setActiveTab("tracking")}
              className={`px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                activeTab === "tracking"
                  ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-600 hover:text-zinc-900 hover:border-b-2 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:border-zinc-700"
              }`}
            >
              📊 Suivi des prédictions
            </button>
          </div>
          <div>
            {activeTab === "live" && <LiveMatches />}
            {activeTab === "management" && <MatchManagement />}
            {activeTab === "tracking" && <UserPredictionTracking />}
          </div>
        </div>
      </PageContainer>
    </AdminGuard>
  );
}
