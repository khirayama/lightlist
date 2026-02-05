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
};

export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
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
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => onOpenChange(false)}
          className="absolute inset-0 bg-black/45"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="w-full items-center"
        >
          <View
            accessibilityViewIsModal
            className="w-full max-w-[460px] rounded-[20px] border p-5 bg-surface dark:bg-surface-dark border-border dark:border-border-dark"
          >
            <View className="gap-1.5 mb-3">
              <Text className="text-lg font-inter-bold text-text dark:text-text-dark">
                {title}
              </Text>
              {description ? (
                <Text className="text-[13px] font-inter text-muted dark:text-muted-dark">
                  {description}
                </Text>
              ) : null}
            </View>
            <View className="gap-4">{children}</View>
            {footer ? (
              <View className="flex-row gap-3 mt-5">{footer}</View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
