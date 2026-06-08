import { AuthGuard } from "@/components/AuthGuard";
import { PageContainer } from "@/components/PageContainer";

export default function MatchesPage() {
  return (
    <AuthGuard>
      <PageContainer
        title="Matches"
        description="Match list and predictions will appear here."
      />
    </AuthGuard>
  );
}
