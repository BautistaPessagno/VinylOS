import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import authRedirects from "@/lib/authRedirects";

const { getSafeAuthCallbackPath } = authRedirects;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}) {
  const { next, mode } = await searchParams;
  const callbackURL = getSafeAuthCallbackPath(next);
  const initialMode = mode === "signup" ? "signup" : "signin";
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(callbackURL);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <AuthForm callbackURL={callbackURL} initialMode={initialMode} />
      </div>
    </div>
  );
}
