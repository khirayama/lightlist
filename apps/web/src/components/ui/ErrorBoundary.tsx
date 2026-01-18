import React, { Component, ErrorInfo, ReactNode } from "react";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-white p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
          <div className="w-full max-w-md space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <AppIcon
                name="alert-circle"
                className="h-6 w-6 text-red-600 dark:text-red-400"
              />
            </div>
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              An unexpected error occurred. Please try reloading the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
