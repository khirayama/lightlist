import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { withTranslation, WithTranslation } from "react-i18next";
import { logException } from "@lightlist/sdk/analytics";

interface Props extends WithTranslation {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundaryBase extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    logException(error.message, true);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
  };

  public render() {
    const { t, children } = this.props;

    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark p-4">
          <View className="w-full max-w-md items-center gap-4">
            <Text className="text-lg font-semibold text-text dark:text-text-dark text-center">
              {t("errorBoundary.title")}
            </Text>
            <Text className="text-sm text-muted dark:text-muted-dark text-center">
              {t("errorBoundary.message")}
            </Text>
            <TouchableOpacity
              onPress={this.handleReload}
              className="rounded-lg bg-primary px-4 py-2 active:opacity-90"
              accessibilityRole="button"
            >
              <Text className="text-sm font-medium text-primaryText dark:text-primaryText-dark">
                {t("errorBoundary.reload")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
