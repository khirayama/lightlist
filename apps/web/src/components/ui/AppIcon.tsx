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
  "logo",
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

const LogoIcon = ({ size, color, title, className, style }: IconBaseProps) => (
  <svg
    viewBox="0 0 512 512"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="0"
    width={size || "1em"}
    height={size || "1em"}
    className={className}
    style={{ color, ...style }}
  >
    {title && <title>{title}</title>}
    <rect x="48" y="48" width="416" height="416" rx="96" />
    <path
      d="M176 178a18 18 0 0 1 18-18h140a18 18 0 1 1 0 36H194a18 18 0 0 1-18-18Zm0 78a18 18 0 0 1 18-18h104a18 18 0 1 1 0 36H194a18 18 0 0 1-18-18Zm0 78a18 18 0 0 1 18-18h140a18 18 0 1 1 0 36H194a18 18 0 0 1-18-18Z"
      fill="white"
    />
  </svg>
);

const ICONS: Record<AppIconName, IconType> = {
  logo: LogoIcon,
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
