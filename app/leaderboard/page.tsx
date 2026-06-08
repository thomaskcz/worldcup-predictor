import { AuthGuard } from "@/components/AuthGuard";
import { PageContainer } from "@/components/PageContainer";

export default function LeaderboardPage() {
  return (
    <AuthGuard>
      <PageContainer
        title="Leaderboard"
        description="User rankings will appear here."
      />
    </AuthGuard>
  );
}
