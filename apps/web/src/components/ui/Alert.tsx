import { ReactNode } from "react";

type AlertVariant = "info" | "error" | "success" | "warning";

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
}

export function Alert({ children }: AlertProps) {
  return <div role="alert">{children}</div>;
}
