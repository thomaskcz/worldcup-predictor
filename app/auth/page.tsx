import { Suspense } from "react";
import { AuthContent } from "./AuthContent";

export default function AuthPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Connexion
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Utilisez votre compte Google pour continuer
        </p>
      </div>

      <Suspense
        fallback={
          <p className="text-center text-zinc-600 dark:text-zinc-400">
            Chargement...
          </p>
        }
      >
        <AuthContent />
      </Suspense>
    </div>
  );
}
