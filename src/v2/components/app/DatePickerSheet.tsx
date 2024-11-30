import qs from "query-string";

import { ParamsSheet } from "v2/components/primitives/ParamsSheet";
import { useCustomTranslation } from "v2/common/i18n";
import { DatePicker } from "components/DatePicker";
import { useTaskLists } from "v2/hooks/app/useTaskLists";

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
