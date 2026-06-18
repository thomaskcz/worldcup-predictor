import { PageContainer } from "@/components/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function GuidePage() {
  return (
    <PageContainer
      title="Guide utilisateur"
      description="Découvrez comment utiliser l'application de pronostics de la RikaiRok World Cup"
      showFootballAccent
    >
      <div className="space-y-8">
        {/* Introduction */}
        <Card variant="festive">
          <div className="flex items-start gap-4">
            <span className="text-5xl">⚽</span>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                Bienvenue sur RikaiRok World Cup !
              </h2>
              <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                Pronostiquez les matchs de la Coupe du Monde et confrontez-vous aux autres rikairokiens.
                Faites vos pronostics, suivez les résultats et grimpez dans le classement pour devenir le champion des pronostics !
              </p>
            </div>
          </div>
        </Card>

        {/* Account & Profile */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <span className="text-3xl">👤</span>
            Compte et Profil
          </h2>
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Connexion simple
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Connectez-vous facilement avec votre compte Google. Pas de mot de passe à retenir !
                </p>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Personnalisez votre pseudo
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Changez votre pseudo dans les paramètres pour que vos amis vous reconnaissent dans le classement.
                </p>
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                    Exemple
                  </p>
                  <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    thomaskaczmarek02@gmail.com → AthomX
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Match Predictions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            Pronostics de Matchs
          </h2>
          <Card>
            <div className="space-y-6">
              <p className="text-base text-zinc-700 dark:text-zinc-300">
                Pour chaque match de la Coupe du Monde, vous pouvez prédire le score exact avant le coup d&apos;envoi.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 dark:bg-emerald-950/30 dark:border-emerald-800">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg">✓</span>
                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      Avant le match
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                    Les pronostics sont ouverts. Vous pouvez modifier votre prédiction autant de fois que vous voulez.
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 dark:bg-amber-950/30 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 dark:text-amber-400 text-lg">🔒</span>
                    <span className="text-sm font-bold text-amber-900 dark:text-amber-100">
                      Après le coup d&apos;envoi
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Les pronostics sont verrouillés. Plus de modifications possibles.
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                  Exemple de prédiction
                </p>
                <p className="mt-2 text-center text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  France 2 - 1 Brésil
                </p>
              </div>
              <Card variant="success">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-600 dark:text-emerald-400 text-xl">✓</span>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100">
                      Enregistrement automatique
                    </h4>
                    <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                      Les pronostics sont enregistrés automatiquement quelques instants après chaque modification. Un message de confirmation apparaît lorsque l&apos;enregistrement est effectué.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </section>

        {/* Competition Predictions */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <span className="text-3xl">🧠</span>
            Pronostics de Compétition (Pré-tournoi)
          </h2>
          <Card>
            <div className="space-y-6">
              <Card variant="warning">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 dark:text-blue-400 text-xl">⚠️</span>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900 dark:text-blue-100">
                      Important
                    </h4>
                    <p className="mt-2 text-xs text-blue-700 dark:text-blue-300">
                      Ces pronostics doivent être faits avant le début du premier match du tournoi. Après, ils seront verrouillés.
                    </p>
                  </div>
                </div>
              </Card>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Phase de groupes
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Prédisez les 1ère et 2ème places de chaque groupe.
                </p>
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                    Exemple
                  </p>
                  <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Groupe A : France 1ère, Allemagne 2ème
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  Phase à élimination directe
                </h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Prédisez les demi-finalistes et les finalistes du tournoi.
                </p>
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <p className="text-xs font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                    Exemple
                  </p>
                  <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Demi-finalistes : France, Brésil, Argentine, Angleterre
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Finalistes : France, Brésil
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Scoring System */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <span className="text-3xl">📊</span>
            Système de Points
          </h2>
          <Card>
            <div className="space-y-6">
              <p className="text-base text-zinc-700 dark:text-zinc-300">
                Accumulez des points grâce à vos pronostics précis. Le système récompense aussi bien les résultats exacts que les scores parfaits !
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg">🎯</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Résultat correct
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Vous gagnez des points si vous prédisez le bon vainqueur ou un match nul.
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-600 dark:text-purple-400 text-lg">⭐</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Score exact
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Bonus supplémentaire si vous trouvez le score exact du match !
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600 dark:text-blue-400 text-lg">🏆</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Pronostics de compétition
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Points pour chaque équipe correctement prédite dans les phases de groupes et à élimination directe.
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-600 dark:text-amber-400 text-lg">📈</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Points bonus
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Bonus supplémentaires pour les pronostics parfaits des phases finales.
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                Consultez la page <Link href="/rules" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline font-semibold">Règles</Link> pour le détail complet des points.
              </p>
            </div>
          </Card>
        </section>

        {/* Leaderboard */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
            <span className="text-3xl">🏅</span>
            Classement
          </h2>
          <Card>
            <div className="space-y-6">
              <p className="text-base text-zinc-700 dark:text-zinc-300">
                Suivez votre progression dans le classement en temps réel. Les utilisateurs sont classés selon leur total de points.
              </p>
              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                  Composition du score
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Points de matchs</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">🎯</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Points de compétition</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">🏆</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-zinc-900 dark:text-zinc-100">Total</span>
                      <span className="text-zinc-900 dark:text-zinc-50">= Score final</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* CTA Section */}
        <Card variant="success" className="text-center p-8">
          <h2 className="text-3xl font-black text-emerald-900 dark:text-emerald-50 mb-3">
            Prêt à commencer ?
          </h2>
          <p className="text-emerald-700 dark:text-emerald-300 mb-8 text-lg">
            Faites vos premiers pronostics et rejoignez la compétition !
          </p>
          <Link href="/matches">
            <Button variant="primary" size="lg">
              <span className="mr-2">⚽</span>
              Commencer à prédire
            </Button>
          </Link>
        </Card>
      </div>
    </PageContainer>
  );
}
