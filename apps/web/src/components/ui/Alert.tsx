import { ReactNode } from "react";

type AlertVariant = "info" | "error" | "success" | "warning";

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  error:
    "bg-red-500/10 border-red-400/40 text-red-900 dark:text-red-100 shadow-[0_14px_50px_rgba(248,113,113,0.32)]",
  info: "bg-cyan-500/10 border-cyan-300/50 text-cyan-900 dark:text-cyan-100 shadow-[0_14px_50px_rgba(34,211,238,0.26)]",
  success:
    "bg-emerald-500/10 border-emerald-300/50 text-emerald-900 dark:text-emerald-100 shadow-[0_14px_50px_rgba(52,211,153,0.24)]",
  warning:
    "bg-amber-500/10 border-amber-300/60 text-amber-900 dark:text-amber-100 shadow-[0_14px_50px_rgba(251,191,36,0.26)]",
};

export function Alert({ children, variant = "info", className }: AlertProps) {
  const styles = [variantStyles[variant], className].filter(Boolean).join(" ");

  return (
    <div
      role="alert"
      className={`p-4 border rounded-xl backdrop-blur-md ${styles}`}
    >
      <div className="text-sm font-medium tracking-tight">{children}</div>
    </div>
  );
}
