export const APP_ICON_NAMES = [
  "menu",
  "edit",
  "share",
  "calendar-today",
  "drag-indicator",
  "settings",
  "close",
  "send",
] as const;

export type AppIconName = (typeof APP_ICON_NAMES)[number];
