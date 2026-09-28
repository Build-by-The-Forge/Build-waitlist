import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";

export function Container({
  as: Tag = "div",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { as?: ElementType }) {
  return <Tag className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

/** Standard section shell: consistent vertical rhythm plus an optional label/heading/intro block. */
export function Section({
  id,
  label,
  heading,
  intro,
  className,
  headerClassName,
  children,
}: {
  id?: string;
  label?: string;
  heading?: ReactNode;
  intro?: ReactNode;
  className?: string;
  headerClassName?: string;
  children?: ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section id={id} aria-labelledby={heading ? headingId : undefined} className={cn("py-24 sm:py-32", className)}>
      <Container>
        {(label || heading) && (
          <Reveal className={cn("max-w-3xl", headerClassName)}>
            {label && <Badge>{label}</Badge>}
            {heading && (
              <h2 id={headingId} className="mt-5 text-heading text-balance">
                {heading}
              </h2>
            )}
            {intro && <p className="mt-6 max-w-2xl text-body text-foreground-muted text-pretty">{intro}</p>}
          </Reveal>
        )}
        {children}
      </Container>
    </section>
  );
}
