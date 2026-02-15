import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import clsx from "clsx";
import { enUS, ja } from "date-fns/locale";
import { useTranslation } from "react-i18next";

export type CalendarProps = ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  ...props
}: CalendarProps) {
  const { i18n } = useTranslation();
  const language = i18n.language.toLowerCase();
  const resolvedLocale = locale ?? (language.startsWith("ja") ? ja : enUS);

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={clsx("p-2", className)}
      locale={resolvedLocale}
      classNames={{
        months: "flex flex-col",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold",
        nav: "space-x-1 flex items-center justify-between",
        nav_button:
          "h-8 w-8 rounded-lg border border-gray-200 bg-white p-0 text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-gray-50 dark:focus-visible:outline-gray-500",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        month_grid: "w-full",
        head_row: "flex",
        head_cell:
          "w-9 text-[0.8rem] font-medium text-gray-500 dark:text-gray-400",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button:
          "h-9 w-9 rounded-lg p-0 font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 aria-selected:bg-gray-900 aria-selected:text-white aria-selected:hover:bg-gray-900 aria-selected:hover:text-white dark:text-gray-50 dark:hover:bg-gray-800 dark:focus-visible:outline-gray-500 dark:aria-selected:bg-gray-50 dark:aria-selected:text-gray-900 dark:aria-selected:hover:bg-gray-50 dark:aria-selected:hover:text-gray-900",
        selected:
          "bg-gray-900 text-white hover:bg-gray-900 hover:text-white dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50 dark:hover:text-gray-900",
        day_selected:
          "bg-gray-900 text-white hover:bg-gray-900 hover:text-white dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50 dark:hover:text-gray-900",
        today: "border border-gray-300 dark:border-gray-700",
        day_today: "border border-gray-300 dark:border-gray-700",
        outside: "text-gray-400 opacity-50 dark:text-gray-500",
        day_outside: "text-gray-400 opacity-50 dark:text-gray-500",
        disabled: "text-gray-400 opacity-50 dark:text-gray-500",
        day_disabled: "text-gray-400 opacity-50 dark:text-gray-500",
        hidden: "invisible",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
