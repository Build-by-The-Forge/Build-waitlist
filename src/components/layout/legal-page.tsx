import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Footer } from "@/components/layout/footer";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border-subtle">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="BUILD home" className="rounded-lg">
            <Logo />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-small text-foreground-muted hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to BUILD
          </Link>
        </Container>
      </header>
      <main id="main">
        <Container className="max-w-3xl py-20 sm:py-28">
          <h1 className="text-heading">{title}</h1>
          <p className="mt-4 text-small text-foreground-subtle">Last updated {updated}</p>
          <div className="mt-12 space-y-8 text-body text-foreground-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
            {children}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
