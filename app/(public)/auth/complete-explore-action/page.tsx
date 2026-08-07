import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth-session";
import { CompleteExploreActionForm } from "./CompleteExploreActionForm";

const COMPLETE_PATH = "/auth/complete-explore-action";

export default async function CompleteExploreActionPage() {
  const session = await getOptionalSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(COMPLETE_PATH)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Finishing your action…</h1>
      <p className="text-sm text-room-dim">
        We&apos;ll return you to Explore when it&apos;s done.
      </p>
      <CompleteExploreActionForm />
    </div>
  );
}
