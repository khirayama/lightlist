import type { ComponentProps } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import type { AppIconName } from "@lightlist/sdk/ui/icons";

type AppIconProps = Omit<ComponentProps<typeof MaterialIcons>, "name"> & {
  name: AppIconName;
};

export const AppIcon = ({ name, ...props }: AppIconProps) => (
  <MaterialIcons name={name} {...props} />
);
