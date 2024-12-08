import qs from "query-string";

import { useCustomTranslation } from "v2/libs/i18n";
import { ParamsSheet } from "v2/libs/ui/components/ParamsSheet";
import { DatePicker } from "v2/libs/ui/components/DatePicker";
import { useTaskLists } from "v2/hooks/useTaskLists";

export function DatePickerSheet(props: {
  handleChange: () => void;
  handleCancel: () => void;
}) {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "datepicker";
  };

  const taskId = qs.parse(window.location.search).taskid as string;
  const { t } = useCustomTranslation("components.DatePickerSheet");
  const [, { updateTask }, { getTaskById }] = useTaskLists();
  const [task, taskList] = getTaskById(taskId);

  return (
    <ParamsSheet isSheetOpen={isSheetOpen} title={t("Date Picker")}>
      <div className="px-4">
        <DatePicker
          autoFocus
          value={task?.date || ""}
          handleChange={(v) => {
            updateTask(taskList.id, {
              ...task,
              date: v,
            });
            props.handleChange();
          }}
          handleCancel={props.handleCancel}
        />
      </div>
    </ParamsSheet>
  );
}
