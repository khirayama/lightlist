import { useCustomTranslation } from "ui/i18n";
import { Sheet } from "components/primitives/Sheet";
import { DatePicker } from "components/primitives/DatePicker";
import { useNavigation } from "navigation/react";
import { useGlobalState } from "globalstate/react";
import { updateTask } from "mutations";

export function DatePickerSheet({ open }) {
  const { t } = useCustomTranslation("components.DatePickerSheet");
  const { t: t2 } = useCustomTranslation("libs.components.DatePicker");

  const navigation = useNavigation();
  const attr = navigation.getAttr();
  const [state, , mutate] = useGlobalState();

  const taskList = state.taskLists[attr.params.taskListId];
  const task = taskList?.tasks.find((t) => t.id === attr.params.taskId);

  return (
    <Sheet
      open={open}
      title={t("Date Picker")}
      onClose={() => navigation.popTo("/home")}
    >
      <div className="px-4">
        <DatePicker
          autoFocus
          value={task?.date || ""}
          handleChange={(v) => {
            mutate(updateTask, {
              taskListId: attr.params.taskListId,
              task: {
                ...task,
                date: v,
              },
            });
            navigation.popTo("/home");
          }}
          handleCancel={() => navigation.popTo("/home")}
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
    </Sheet>
  );
}
