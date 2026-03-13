import type { ComponentProps } from "react";
import { DayPicker } from "react-day-picker";
import clsx from "clsx";
import type { Locale } from "date-fns";
import {
  ar,
  de,
  enUS,
  es,
  fr,
  hi,
  id,
  ja,
  ko,
  ptBR,
  zhCN,
} from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Language } from "@lightlist/sdk/types";
import { normalizeLanguage } from "@lightlist/sdk/utils/language";

type CalendarProps = ComponentProps<typeof DayPicker>;

const DATE_FNS_LOCALE_BY_LANGUAGE: Record<Language, Locale> = {
  ja,
  en: enUS,
  es,
  de,
  fr,
  ko,
  "zh-CN": zhCN,
  hi,
  ar,
  "pt-BR": ptBR,
  id,
};

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  ...props
}: CalendarProps) {
  const { i18n } = useTranslation();
  const language = normalizeLanguage(i18n.language);
  const resolvedLocale = locale ?? DATE_FNS_LOCALE_BY_LANGUAGE[language];

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
          "h-8 w-8 rounded-lg border border-border bg-surface p-0 text-muted hover:bg-background hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark dark:text-muted-dark dark:hover:bg-background-dark dark:hover:text-text-dark dark:focus-visible:outline-muted-dark",
        nav_button_previous: "absolute ltr:left-1 rtl:right-1",
        nav_button_next: "absolute ltr:right-1 rtl:left-1",
        table: "w-full border-collapse space-y-1",
        month_grid: "w-full",
        head_row: "flex",
        head_cell:
          "w-9 text-[0.8rem] font-medium text-placeholder dark:text-placeholder-dark",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative",
        day: "h-9 w-9 text-center text-sm p-0 relative",
        day_button:
          "h-9 w-9 rounded-lg p-0 font-medium text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted aria-selected:bg-primary aria-selected:text-primaryText dark:text-text-dark dark:focus-visible:outline-muted-dark dark:aria-selected:bg-primary-dark dark:aria-selected:text-primaryText-dark",
        selected: "bg-border rounded-lg dark:bg-surface",
        today: "border border-border dark:border-border-dark",
        day_today: "border border-border dark:border-border-dark",
        outside: "text-placeholder opacity-50 dark:text-placeholder-dark",
        day_outside: "text-placeholder opacity-50 dark:text-placeholder-dark",
        disabled: "text-placeholder opacity-50 dark:text-placeholder-dark",
        day_disabled: "text-placeholder opacity-50 dark:text-placeholder-dark",
        hidden: "invisible",
        day_hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}
