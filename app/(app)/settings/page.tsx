import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { requireSession } from "@/lib/auth-session";
import { SettingsForm } from "./SettingsForm";
import { PasswordForm } from "./PasswordForm";
import { DeleteAccountSection } from "./DeleteAccountSection";

export default async function SettingsPage() {
  const session = await requireSession();
  const accounts = await auth.api.listUserAccounts({ headers: await headers() });
  const hasPassword = accounts.some((account) => account.providerId === "credential");

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <SettingsForm
        name={session.user.name}
        username={session.user.username ?? session.user.displayUsername ?? ""}
        email={session.user.email}
      />

      {hasPassword && <PasswordForm />}

      <DeleteAccountSection
        username={session.user.username ?? session.user.displayUsername ?? ""}
      />
    </div>
  );
}
