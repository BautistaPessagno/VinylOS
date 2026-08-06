import { Suspense } from "react";
import { getOptionalSession } from "@/lib/auth-session";
import { AppNav } from "@/app/(app)/AppNav";
import { ToastProvider } from "@/app/(app)/toast/ToastProvider";
import { FlashToaster } from "@/app/(app)/toast/FlashToaster";
import { PublicGuestNav } from "./PublicGuestNav";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getOptionalSession();

  return (
    <ToastProvider>
      <div className="flex flex-1 flex-col">
        {session ? (
          <AppNav
            name={session.user.name}
            handle={session.user.displayUsername ?? session.user.username ?? null}
            image={session.user.image}
            userId={session.user.id}
          />
        ) : (
          <Suspense
            fallback={
              <header className="border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-6 py-4">
                  <span className="font-semibold">VinylOS</span>
                </div>
              </header>
            }
          >
            <PublicGuestNav />
          </Suspense>
        )}
        {/* Extra bottom padding on mobile only when the signed-in tab bar is present. */}
        <main
          className={
            session
              ? "flex flex-1 flex-col px-6 pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-8"
              : "flex flex-1 flex-col px-6 pt-8 pb-8"
          }
        >
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <FlashToaster />
      </Suspense>
    </ToastProvider>
  );
}
