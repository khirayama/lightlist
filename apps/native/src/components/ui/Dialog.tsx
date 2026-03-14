import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  overlayAccessible?: boolean;
  overlayAccessibilityLabel?: string;
};

export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  overlayAccessible = false,
  overlayAccessibilityLabel,
}: DialogProps) => {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <View className="flex-1 justify-center items-center p-6">
        <Pressable
          accessible={overlayAccessible}
          accessibilityRole={overlayAccessible ? "button" : undefined}
          accessibilityLabel={
            overlayAccessible ? overlayAccessibilityLabel : undefined
          }
          onPress={() => onOpenChange(false)}
          className="absolute inset-0 bg-black/40"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="w-full items-center"
        >
          <View
            accessibilityViewIsModal
            className="w-full max-w-[460px] rounded-xl border p-5 bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
          >
            <View className="gap-1.5 mb-3">
              <Text
                accessibilityRole="header"
                className="text-lg font-inter-bold text-text dark:text-text-dark"
              >
                {title}
              </Text>
              {description ? (
                <Text className="text-sm font-inter text-muted dark:text-muted-dark">
                  {description}
                </Text>
              ) : null}
            </View>
            <View className="gap-4">{children}</View>
            {footer ? (
              <View className="flex-row flex-wrap justify-end gap-2 mt-4">
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
