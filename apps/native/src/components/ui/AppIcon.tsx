import type { ComponentProps } from "react";
import { MaterialIcons } from "@expo/vector-icons";

const APP_ICON_NAMES = [
  "menu",
  "edit",
  "share",
  "calendar-today",
  "drag-indicator",
  "settings",
  "close",
  "send",
] as const;

type AppIconName = (typeof APP_ICON_NAMES)[number];

type AppIconProps = Omit<ComponentProps<typeof MaterialIcons>, "name"> & {
  name: AppIconName;
};

export const AppIcon = ({ name, ...props }: AppIconProps) => (
  <MaterialIcons name={name} {...props} />
);
