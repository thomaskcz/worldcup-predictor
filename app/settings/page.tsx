import { AuthGuard } from "@/components/AuthGuard";
import { PageContainer } from "@/components/PageContainer";
import { NicknameEditor } from "@/components/settings/NicknameEditor";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <>
        <PageContainer
          title="Paramètres"
          description="Gérer votre profil et vos préférences."
        />
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 sm:px-6">
          <div className="space-y-6">
            <NicknameEditor />
          </div>
        </div>
      </>
    </AuthGuard>
  );
}
