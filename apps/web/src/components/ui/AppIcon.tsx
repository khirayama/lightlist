import type { IconBaseProps, IconType } from "react-icons";
import {
  MdCalendarToday,
  MdClose,
  MdDragIndicator,
  MdEdit,
  MdMenu,
  MdSend,
  MdSettings,
  MdShare,
} from "react-icons/md";
import type { AppIconName } from "@lightlist/sdk/ui/icons";

const ICONS: Record<AppIconName, IconType> = {
  "calendar-today": MdCalendarToday,
  close: MdClose,
  "drag-indicator": MdDragIndicator,
  edit: MdEdit,
  menu: MdMenu,
  send: MdSend,
  settings: MdSettings,
  share: MdShare,
};

type AppIconProps = IconBaseProps & {
  name: AppIconName;
};

export const AppIcon = ({ name, ...props }: AppIconProps) => {
  const IconComponent = ICONS[name];
  return <IconComponent {...props} />;
};
