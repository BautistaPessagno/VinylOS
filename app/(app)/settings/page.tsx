import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-session";

export default async function SettingsPage() {
  const session = await requireSession();
  redirect(`/users/${session.user.id}?view=settings`);
}
