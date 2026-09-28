import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap " +
  "transition-[background-color,color,box-shadow,transform] duration-200 ease-out-soft " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-12px_rgba(15,16,19,0.6)] hover:bg-[#262830]",
  secondary: "bg-surface text-foreground ring-1 ring-border hover:ring-foreground/30 hover:bg-surface",
  ghost: "text-foreground-muted hover:text-foreground",
  inverse: "bg-ink-foreground text-ink hover:bg-white",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.9375rem]",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses({ variant, size, className })} {...props} />;
});

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <a className={buttonClasses({ variant, size, className })} {...props} />;
}
