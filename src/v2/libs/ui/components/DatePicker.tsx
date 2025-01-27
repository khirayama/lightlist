import { useState, useRef, useEffect } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
} from "date-fns";
import clsx from "clsx";

import { Icon } from "./Icon";

export function DatePicker(props: {
  value: string;
  autoFocus?: boolean;
  handleChange: (val: string) => void;
  handleCancel: () => void;
  labels: {
    reset: string;
    cancel: string;
    titleSunday: string;
    titleMonday: string;
    titleTuesday: string;
    titleWednesday: string;
    titleThursday: string;
    titleFriday: string;
    titleSaturday: string;
    sunday: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
  };
}) {
  const ref = useRef<HTMLTableSectionElement>(null);
  const [val, setVal] = useState<string>(
    props.value || format(new Date(), "yyyy-MM-dd"),
  );
  const [refDate, setRefDate] = useState<Date>(
    props.value ? new Date(props.value) : new Date(),
  );

  const handleDateClick = (d: Date) => {
    const v = format(d, "yyyy-MM-dd");
    if (props.value !== v) {
      setVal(v);
      props.handleChange(v);
    }
  };

  const getCal = (date: Date) => {
    const sundays = eachWeekOfInterval({
      start: startOfMonth(date),
      end: endOfMonth(date),
    });
    return sundays.map((sunday) => {
      return eachDayOfInterval({
        start: sunday,
        end: endOfWeek(sunday),
      });
    });
  };

  const cal = getCal(refDate);
  const headDate = startOfMonth(refDate);
  const lastDate = endOfMonth(addMonths(refDate, 0));

  useEffect(() => {
    if (props.autoFocus) {
      ref.current.focus();
    }
  }, []);

  return (
    <div>
      <table className="w-full">
        <thead className="sticky top-0">
          <tr>
            <th colSpan={7} className="p-2">
              <div className="flex px-2">
                {val ? (
                  <span className="flex-1 py-1 text-left">
                    {format(val, "yyyy/MM/dd")}(
                    {props.labels["title" + format(val, "EEEE")]})
                  </span>
                ) : null}
                <button
                  className="rounded-sm px-2 py-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                  onClick={() => {
                    setVal("");
                    props.handleChange("");
                  }}
                >
                  {props.labels.reset}
                </button>
                <button
                  className="rounded-sm px-2 py-1 focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
                  onClick={() => {
                    setVal(props.value);
                    props.handleCancel();
                  }}
                >
                  {props.labels.cancel}
                </button>
              </div>
            </th>
          </tr>
          <tr>
            <td colSpan={7}>
              <div className="flex px-4 pb-2 pt-8 text-center font-bold">
                <button
                  className="rounded-sm p-1 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setRefDate(addMonths(refDate, -1));
                  }}
                >
                  <Icon text="arrow_left" />
                </button>
                <div className="flex-1">{format(refDate, "yyyy/MM")}</div>
                <button
                  className="rounded-sm p-1 focus-visible:bg-gray-200 dark:fill-white dark:focus-visible:bg-gray-700"
                  onClick={(e) => {
                    e.preventDefault();
                    setRefDate(addMonths(refDate, 1));
                  }}
                >
                  <Icon text="arrow_right" />
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <th className="p-2 pb-4">{props.labels.sunday}</th>
            <th className="p-2 pb-4">{props.labels.monday}</th>
            <th className="p-2 pb-4">{props.labels.tuesday}</th>
            <th className="p-2 pb-4">{props.labels.wednesday}</th>
            <th className="p-2 pb-4">{props.labels.thursday}</th>
            <th className="p-2 pb-4">{props.labels.friday}</th>
            <th className="p-2 pb-4">{props.labels.saturday}</th>
          </tr>
        </thead>

        <tbody
          ref={ref}
          tabIndex={0}
          className="relative mx-auto w-full max-w-[420px] focus-visible:bg-gray-200 dark:focus-visible:bg-gray-700"
          onKeyDown={(e) => {
            e.stopPropagation();

            const key = e.key;
            if (key === "ArrowDown") {
              e.preventDefault();
              const d = val ? addDays(val, 7) : headDate;
              setVal(format(d, "yyyy-MM-dd"));
              setRefDate(d);
            } else if (key === "ArrowUp") {
              e.preventDefault();
              const d = val ? addDays(val, -7) : lastDate;
              setVal(format(d, "yyyy-MM-dd"));
              setRefDate(d);
            } else if (key === "ArrowLeft") {
              e.preventDefault();
              const d = val ? addDays(val, -1) : startOfMonth(refDate);
              setVal(format(d, "yyyy-MM-dd"));
              setRefDate(d);
            } else if (key === "ArrowRight") {
              e.preventDefault();
              const d = val ? addDays(val, 1) : startOfMonth(refDate);
              setVal(format(d, "yyyy-MM-dd"));
              setRefDate(d);
            } else if (key === "Enter") {
              e.preventDefault();
              props.handleChange(val);
              e.currentTarget.blur();
            } else if (key === "Backspace" || key === "Delete") {
              e.preventDefault();
              if (props.value !== "") {
                props.handleChange("");
              } else {
                props.handleCancel();
              }
              e.currentTarget.blur();
            } else if (key === "Escape") {
              /* FYI: No calling e.preventDefault */
              setVal(props.value);
            }
          }}
        >
          {cal.map((week) => (
            <tr key={week.toString()}>
              {week.map((day) => (
                <td
                  key={day.toString()}
                  className="cursor-pointer p-2 text-center"
                  onClick={() => handleDateClick(day)}
                >
                  {day.getMonth() === refDate.getMonth() && (
                    <div
                      className={clsx(
                        "flex h-8 w-8 items-center justify-center rounded-full p-4",
                        val === format(day, "yyyy-MM-dd") &&
                          "bg-gray-600 text-white dark:bg-gray-300 dark:text-black",
                      )}
                    >
                      <span>{day.getDate()}</span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
