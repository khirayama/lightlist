import { useCustomTranslation } from "ui/i18n";
import { Sheet } from "components/primitives/Sheet";
import { useNavigation } from "navigation/react";
import { useGlobalState } from "globalstate/react";
import { refreshShareCode } from "mutations";

export function SharingSheet({ open }) {
  const { t } = useCustomTranslation("components.SharingSheet");

  const [state, , mutate] = useGlobalState();
  const navigation = useNavigation();
  const attr = navigation.getAttr();

  const taskListId = attr.params.taskListId;
  const taskList = state.taskLists[taskListId];
  const shareUrl = `${window?.location?.origin}/share?code=${taskList?.shareCode}`;

  return (
    <Sheet
      open={open}
      onClose={() => {
        navigation.popTo("/home");
      }}
    >
      <div className="p-4">
        <button
          className="w-full rounded-sm border bg-gray-100 p-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
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
            className="w-full rounded-sm border bg-gray-100 p-2 focus-visible:bg-gray-200 disabled:opacity-30 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            disabled={!window?.navigator?.share}
            onClick={() => {
              window.navigator.share({
                title: t("Share {{name}} list", {
                  name: taskList?.name,
                }),
                text: t("Please join {{name}} list!", {
                  name: taskList?.name,
                }),
                url: shareUrl,
              });
            }}
          >
            {t("Share with other apps")}
          </button>
        </div>

        <div className="py-2">
          <button
            className="w-full rounded-sm border bg-gray-100 p-2 focus-visible:bg-gray-200 dark:bg-gray-600 dark:focus-visible:bg-gray-700"
            onClick={(e) => {
              e.preventDefault();
              mutate(refreshShareCode, { taskListId: taskList?.id });
            }}
          >
            {t("Refresh share code")}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
