import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function HomePage() {
  return (
    <PageContainer
      title="Accueil"
      description="Bienvenue à la RikaiRok World Cup !! Après 4 ans d'hibernation pour tous les participants ainsi que pour ceux qui ne s'étaient pas qualifiés ou qui avaient abandonné il y a 4 ans, il est temps de se remettre dans le bain et surtout ressortir tous vos guides, vos secrets, vos grigris du pronostic parfait en espérant arborer cette si belle étoile de vainqueur sur votre maillot. Alors faites vos pronostics, suivez les matchs, grimpez dans le classement et que le meilleur gagne !"
      showFootballAccent
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="festive" className="flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
              🎯 Pronostics de matchs
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Prédisez les scores de chaque match avant le coup d'envoi. Modifiez vos pronostics autant de fois que vous voulez avant le début du match.
            </p>
          </div>
          <Link href="/matches" className="mt-4">
            <Button variant="festive" className="w-full">
              Faire mes pronostics
            </Button>
          </Link>
        </Card>

        <Card variant="success" className="flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
              🧠 Pronostics de compétition
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Prédisez les vainqueurs de groupe, demi-finalistes et finalistes avant le début du tournoi pour marquer des points bonus.
            </p>
          </div>
          <Link href="/competition-predictions" className="mt-4">
            <Button variant="primary" className="w-full">
              Prédictions de compétition
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
              🏅 Classement
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Suivez votre progression dans le classement en temps réel. Voyez comment vous vous situez par rapport aux autres participants.
            </p>
          </div>
          <Link href="/leaderboard" className="mt-4">
            <Button variant="secondary" className="w-full">
              Voir le classement
            </Button>
          </Link>
        </Card>

        <Card className="flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
              📖 Guide utilisateur
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Découvrez comment utiliser l'application, comprendre le système de points et optimiser vos pronostics.
            </p>
          </div>
          <Link href="/guide" className="mt-4">
            <Button variant="ghost" className="w-full">
              Consulter le guide
            </Button>
          </Link>
        </Card>
      </div>
    </PageContainer>
  );
}
