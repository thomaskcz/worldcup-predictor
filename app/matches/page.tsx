import { AuthGuard } from "@/components/AuthGuard";
import { MatchesList } from "@/components/matches/MatchesList";
import { PageContainer } from "@/components/PageContainer";

export default function MatchesPage() {
  return (
    <AuthGuard>
      <PageContainer
        title="Matchs"
        description="Prédisez les scores avant le coup d'envoi. Vous pouvez modifier vos pronostics jusqu'au début de chaque match."
      />
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 sm:px-6">
        <MatchesList />
      </div>
    </AuthGuard>
  );
}
