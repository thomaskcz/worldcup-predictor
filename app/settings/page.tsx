import { PageContainer } from "@/components/PageContainer";
import { SettingsContent } from "@/components/settings/SettingsContent";

export default function SettingsPage() {
  return (
    <>
      <PageContainer
        title="Settings"
        description="Log in or define your nickname to use the app."
      />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 sm:px-6">
        <SettingsContent />
      </div>
    </>
  );
}
