import { forwardRef } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "ai" | "danger" | "outline";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-light",
  secondary: "bg-sage-light text-primary hover:bg-sage",
  outline: "border border-line bg-white text-ink hover:border-primary/40",
  ghost: "text-ink hover:bg-black/5",
  ai: "bg-ai text-ink hover:brightness-95",
  danger: "bg-red-50 text-red-700 hover:bg-red-100",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }
>(({ variant = "primary", size = "md", loading, className, children, disabled, ...p }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
      size === "sm" && "h-9 px-3 text-sm",
      size === "md" && "h-11 px-4 text-sm",
      size === "lg" && "h-12 px-6 text-base",
      variants[variant],
      className,
    )}
    {...p}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
));

const field =
  "w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-ink-faint outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, "h-11", className)} {...p} />
));

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => <textarea ref={ref} className={cn(field, "min-h-[110px] py-3", className)} {...p} />,
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...p }, ref) => (
    <select ref={ref} className={cn(field, "h-11 appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B716D' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
      {...p}>
      {children}
    </select>
  ),
);

export function Label({ children, required, hint }: { children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {required && <span className="text-red-600"> *</span>}
      {hint && <span className="ml-1 font-normal text-ink-faint">{hint}</span>}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "green" | "ai" | "red"; className?: string }) {
  const tones = {
    neutral: "bg-black/5 text-ink-muted",
    green: "bg-sage-light text-primary",
    ai: "bg-ai-light text-ai-dark",
    red: "bg-red-50 text-red-700",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-card", className)}>{children}</div>;
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-sage-light text-primary">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-20 text-primary">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
