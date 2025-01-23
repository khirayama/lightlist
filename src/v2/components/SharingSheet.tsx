import qs from "query-string";
import { useRouter } from "next/router";

import { useCustomTranslation } from "v2/libs/i18n";
import { ParamsSheet } from "v2/libs/ui/components/ParamsSheet";
import { useTaskLists } from "v2/hooks/useTaskLists";

export function SharingSheet() {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "sharing";
  };

  const router = useRouter();
  const taskListId = router.query.tasklistid as string;

  const [, { refreshShareCode }, { getTaskListById }] = useTaskLists();
  const taskList = getTaskListById(taskListId);

  const { t } = useCustomTranslation("components.SharingSheet");
  const shareUrl = `${window?.location?.origin}/share?code=${taskList?.shareCode}`;

  return (
    <ParamsSheet
      isSheetOpen={isSheetOpen}
      title={t("Share {{name}} list", {
        name: taskList?.name || "",
      })}
    >
      <div className="p-4">
        <button
          className="w-full rounded border bg-gray-100 p-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
          onClick={() => {
            /* FYI: Only work under https or localhost */
            try {
              window.navigator.clipboard.writeText(shareUrl);
              window.alert(t("Copied to clipboard"));
            } catch (err) {
              window.alert(t("Need to run this under https or localhost"));
            }
          }}
        >
          {shareUrl}
        </button>

        <div className="py-2">
          <button
            className="w-full rounded border bg-gray-100 p-2 focus-visible:bg-gray-200 disabled:opacity-30 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            disabled={!window?.navigator?.share}
            onClick={async () => {
              try {
                await window.navigator.share({
                  title: t("Share {{name}} list", {
                    name: taskList?.name,
                  }),
                  text: t("Please join {{name}} list!", {
                    name: taskList?.name,
                  }),
                  url: shareUrl,
                });
              } catch (err) {
                window.alert(t("Need to run this under https or localhost"));
              }
            }}
          >
            {t("Share with other apps")}
          </button>
        </div>

        <div className="py-2">
          <button
            className="w-full rounded border bg-gray-100 p-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            onClick={(e) => {
              e.preventDefault();
              refreshShareCode(taskList?.shareCode);
            }}
          >
            {t("Refresh share code")}
          </button>
        </div>
      </div>
    </ParamsSheet>
  );
}
