import qs from "query-string";

import { useCustomTranslation } from "v2/libs/i18n";
import { ParamsSheet } from "v2/libs/ui/components/ParamsSheet";
import { DatePicker } from "v2/libs/ui/components/DatePicker";

export function DatePickerSheet(props: {
  taskLists: { [id: string]: TaskListV2 };
  handleChange: () => void;
  handleCancel: () => void;
}) {
  const isSheetOpen = () => {
    return qs.parse(window.location.search).sheet === "datepicker";
  };

  const taskId = qs.parse(window.location.search).taskid as string;
  const { t } = useCustomTranslation("components.DatePickerSheet");
  const { t: t2 } = useCustomTranslation("libs.components.DatePicker");
  const taskList = props.taskLists[taskId];
  const task = taskList?.tasks.find((t) => t.id === taskId);

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
          labels={{
            reset: t2("Reset"),
            cancel: t2("Cancel"),
            titleSunday: t2("Sun"),
            titleMonday: t2("Mon"),
            titleTuesday: t2("Tue"),
            titleWednesday: t2("Wed"),
            titleThursday: t2("Thu"),
            titleFriday: t2("Fri"),
            titleSaturday: t2("Sat"),
            sunday: t2("Sunday"),
            monday: t2("Monday"),
            tuesday: t2("Tuesday"),
            wednesday: t2("Wednesday"),
            thursday: t2("Thursday"),
            friday: t2("Friday"),
            saturday: t2("Saturday"),
          }}
        />
      </div>
    </ParamsSheet>
  );
}
