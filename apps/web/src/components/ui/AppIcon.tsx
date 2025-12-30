import type { IconBaseProps, IconType } from "react-icons";
import {
  MdCalendarToday,
  MdClose,
  MdDragIndicator,
  MdEdit,
  MdMenu,
  MdSend,
  MdSort,
  MdSettings,
  MdShare,
  MdDelete,
} from "react-icons/md";

const APP_ICON_NAMES = [
  "menu",
  "edit",
  "share",
  "calendar-today",
  "drag-indicator",
  "settings",
  "close",
  "send",
  "sort",
  "delete",
] as const;

type AppIconName = (typeof APP_ICON_NAMES)[number];

const ICONS: Record<AppIconName, IconType> = {
  "calendar-today": MdCalendarToday,
  close: MdClose,
  "drag-indicator": MdDragIndicator,
  edit: MdEdit,
  menu: MdMenu,
  send: MdSend,
  settings: MdSettings,
  share: MdShare,
  sort: MdSort,
  delete: MdDelete,
};

type AppIconProps = IconBaseProps & {
  name: AppIconName;
};

export const AppIcon = ({ name, ...props }: AppIconProps) => {
  const IconComponent = ICONS[name];
  return <IconComponent {...props} />;
};
