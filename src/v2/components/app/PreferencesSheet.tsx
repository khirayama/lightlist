import * as Select from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "@radix-ui/react-icons";
import qs from "query-string";

import { ParamsSheet } from "v2/components/primitives/ParamsSheet";
import { usePreferences } from "v2/hooks/app/usePreferences";
import { useCustomTranslation } from "v2/common/i18n";

export function PreferencesSheet() {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "preferences";
  };

  const { t, supportedLanguages } = useCustomTranslation(
    "components.PreferencesSheet",
  );
  const [{ data: preferences }, { updatePreferences }] = usePreferences();

  const themes = ["SYSTEM", "LIGHT", "DARK"];
  const lang = preferences.lang.toLowerCase();

  return (
    <ParamsSheet isSheetOpen={isSheetOpen} title={t("Preferences")}>
      <div className="flex p-4">
        <div className="flex-1">{t("Appearance")}</div>
        <Select.Root
          value={preferences.theme}
          onValueChange={(v: Preferences["theme"]) => {
            updatePreferences({
              theme: v,
            });
          }}
        >
          <Select.Trigger className="bg-button inline-flex items-center rounded border p-2">
            <Select.Value aria-label={t(preferences.theme)}>
              {t(preferences.theme)}
            </Select.Value>
            <Select.Icon className="pl-2">
              <ChevronDownIcon />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg z-[500] rounded border p-2 shadow">
              <Select.Viewport>
                {themes.map((theme) => (
                  <Select.Item
                    key={theme}
                    value={theme}
                    className="bg-button flex items-center p-2"
                  >
                    <Select.ItemText>{t(theme)}</Select.ItemText>
                    <Select.ItemIndicator>
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="flex p-4">
        <div className="flex-1">{t("Language")}</div>
        <Select.Root
          value={lang}
          onValueChange={(v: Preferences["lang"]) => {
            updatePreferences({
              lang: v,
            });
          }}
        >
          <Select.Trigger className="inline-flex items-center rounded border p-2 focus-visible:bg-gray-200 dark:text-white dark:focus-visible:bg-gray-700">
            <Select.Value aria-label={t(preferences.lang)}>
              {t(preferences.lang)}
            </Select.Value>
            <Select.Icon className="pl-2">
              <ChevronDownIcon />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="bg focus-visible:bg z-[500] rounded border p-2 shadow dark:focus-visible:bg-gray-700">
              <Select.Viewport>
                {supportedLanguages.map((ln) => (
                  <Select.Item
                    key={ln}
                    value={ln}
                    className="flex items-center p-2 focus-visible:bg-gray-200 dark:text-white dark:focus-visible:bg-gray-700"
                  >
                    <Select.ItemText>{t(ln)}</Select.ItemText>
                    <Select.ItemIndicator>
                      <CheckIcon />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>
    </ParamsSheet>
  );
}
