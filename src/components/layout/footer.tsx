import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { navLinks, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <Container className="grid gap-12 py-16 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-5 max-w-xs text-foreground-muted">
            Your learning journey,
            <br />
            intelligently connected.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="space-y-3 text-small">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={`/${link.href}`} className="text-foreground-muted transition-colors hover:text-foreground">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <ul className="space-y-3 text-small">
          <li>
            <Link href="/privacy" className="text-foreground-muted transition-colors hover:text-foreground">
              Privacy
            </Link>
          </li>
          <li>
            <Link href="/terms" className="text-foreground-muted transition-colors hover:text-foreground">
              Terms
            </Link>
          </li>
        </ul>
      </Container>
      <Container className="border-t border-border-subtle py-6">
        <p className="text-small text-foreground-subtle">
          © {new Date().getFullYear()} {site.name}
        </p>
      </Container>
    </footer>
  );
}
