import React, { Component, ErrorInfo, ReactNode } from "react";
import { withTranslation, WithTranslation } from "react-i18next";

import { AppIcon } from "@/components/ui/AppIcon";
import { logException } from "@lightlist/sdk/analytics";

interface Props extends WithTranslation {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryBase extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    logException(error.message, true);
  }

  public render() {
    const { t, children, fallback } = this.props;

    if (this.state.hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-surface p-4 text-text dark:bg-background-dark dark:text-text-dark">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AppIcon
                name="alert-circle"
                className="h-6 w-6 text-red-600 dark:text-red-400"
              />
            </div>
            <h2 className="text-lg font-semibold">{t("pages.error.title")}</h2>
            <p className="text-sm text-muted dark:text-muted-dark">
              {t("pages.error.description")}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primaryText hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-primary-dark dark:text-primaryText-dark dark:hover:opacity-90"
            >
              {t("pages.error.reload")}
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
