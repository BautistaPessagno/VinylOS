import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppNav } from "./AppNav";
import { ToastProvider } from "./toast/ToastProvider";
import { FlashToaster } from "./toast/FlashToaster";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <ToastProvider>
      <div className="flex flex-1 flex-col">
        <AppNav
          name={session.user.name}
          handle={session.user.displayUsername ?? session.user.username ?? null}
          image={session.user.image}
          userId={session.user.id}
        />
        <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
      </div>
      <Suspense fallback={null}>
        <FlashToaster />
      </Suspense>
    </ToastProvider>
  );
}
