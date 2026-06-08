import { AuthGuard } from "@/components/AuthGuard";
import { MatchesList } from "@/components/matches/MatchesList";
import { PageContainer } from "@/components/PageContainer";

export default function MatchesPage() {
  return (
    <AuthGuard>
      <PageContainer
        title="Matches"
        description="Predict scores before kickoff. You can update your picks until each match starts."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
        <MatchesList />
      </div>
    </AuthGuard>
  );
}
