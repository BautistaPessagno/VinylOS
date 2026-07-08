import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <nav className="flex items-center gap-6">
          <Link href="/collection" className="font-semibold">
            VinylOS
          </Link>
          <Link href="/collection" className="text-sm text-zinc-600 hover:text-black">
            Collection
          </Link>
          <Link href="/wrapped" className="text-sm text-zinc-600 hover:text-black">
            Wrapped
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col px-6 py-8">{children}</main>
    </div>
  );
}
