"use client";

import { useState } from "react";
import { AdminGuard } from "@/components/AdminGuard";
import { PageContainer } from "@/components/PageContainer";
// Assuming I will create these components
import { MatchManagement } from "@/components/admin/MatchManagement";
import { LiveMatches } from "@/components/admin/LiveMatches";
import {useAuth} from "@/components/AuthProvider";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<"live" | "management" >("live");

  if (loading || !user || !user.is_admin) {
    return null;
  }

  return (
    <AdminGuard>
      <PageContainer title="Admin" description="Manage matches and scores.">
        <div className="space-y-4">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
                onClick={() => setActiveTab("live")}
                className={`px-4 py-2 font-medium ${
                    activeTab === "live"
                        ? "border-b-2 border-zinc-900 dark:border-zinc-100"
                        : "text-zinc-600 dark:text-zinc-400"
                }`}
            >
              Live Matches
            </button>
            <button
              onClick={() => setActiveTab("management")}
              className={`px-4 py-2 font-medium ${
                activeTab === "management"
                  ? "border-b-2 border-zinc-900 dark:border-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              Match Management
            </button>
          </div>
          <div>
            {activeTab === "live" && <LiveMatches />}
            {activeTab === "management" && <MatchManagement />}
          </div>
        </div>
      </PageContainer>
    </AdminGuard>
  );
}
