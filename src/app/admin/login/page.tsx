import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signIn } from "@/auth";
import { Logo } from "@/components/ui/logo";
import { getAdmin } from "@/lib/admin/session";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET);

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}

export default async function AdminLoginPage({ searchParams }: Props) {
  if (await getAdmin().catch(() => null)) redirect("/admin/waitlist");

  const params = await searchParams;
  const message = params.denied
    ? "This Google account doesn't have administrator access."
    : params.error
      ? "Sign-in didn't complete. Please try again."
      : null;

  async function continueWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/admin/waitlist" });
  }

  return (
    <main id="main" className="grid min-h-svh place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <div className="mt-10 rounded-3xl bg-surface p-8 ring-1 ring-border-subtle shadow-[0_24px_48px_-32px_rgba(15,16,19,0.35)]">
          <span className="grid size-10 place-items-center rounded-2xl bg-surface-muted">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-2 text-small text-foreground-muted">
            Restricted to authorized BUILD administrators. There is no public signup.
          </p>

          {message && (
            <p role="alert" className="mt-5 rounded-xl bg-[#fdecea] px-4 py-3 text-small text-danger">
              {message}
            </p>
          )}

          {googleConfigured ? (
            <form action={continueWithGoogle} className="mt-6">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-surface text-[0.9375rem] font-medium ring-1 ring-border transition-shadow hover:ring-foreground/30"
              >
                <GoogleMark />
                Continue with Google
              </button>
            </form>
          ) : (
            <p className="mt-6 rounded-xl bg-surface-muted px-4 py-3 text-small text-foreground-muted">
              Google sign-in isn&rsquo;t configured. Set <code className="font-mono">AUTH_SECRET</code>,{" "}
              <code className="font-mono">AUTH_GOOGLE_ID</code> and <code className="font-mono">AUTH_GOOGLE_SECRET</code>.
            </p>
          )}
        </div>
        <p className="mt-6 text-center text-small text-foreground-subtle">
          <Link href="/" className="hover:text-foreground">
            ← Back to BUILD
          </Link>
        </p>
      </div>
    </main>
  );
}
