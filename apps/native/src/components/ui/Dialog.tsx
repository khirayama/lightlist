import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { styles } from "../../styles/appStyles";
import type { Theme } from "../../styles/theme";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  theme: Theme;
  children: ReactNode;
  footer?: ReactNode;
};

export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  theme,
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
      <View style={styles.dialogOverlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => onOpenChange(false)}
          style={styles.dialogBackdrop}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.dialogKeyboard}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.dialogCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>
                {title}
              </Text>
              {description ? (
                <Text
                  style={[styles.dialogDescription, { color: theme.muted }]}
                >
                  {description}
                </Text>
              ) : null}
            </View>
            <View style={styles.dialogBody}>{children}</View>
            {footer ? <View style={styles.dialogFooter}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
