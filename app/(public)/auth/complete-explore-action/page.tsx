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
      <h1 className="text-2xl font-semibold">Completando tu acción…</h1>
      <p className="text-sm text-room-dim">
        Te llevaremos de vuelta a Explorar cuando termine.
      </p>
      <CompleteExploreActionForm />
    </div>
  );
}
