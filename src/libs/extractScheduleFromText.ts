import { add, nextDay, isBefore, Day, format } from "date-fns";

const regexps = {
  today: /^(today|今日)\s/i,
  tomorrow: /^(tomorrow|明日)\s/i,
  date: /^([0-9]{1,2}(\/|\.|\-)[0-9]{1,2}|[0-9]{2,4}(\/|\.|\-)[0-9]{1,2}(\/|\.|\-)[0-9]{2,4}|[0-9]{4})\s/,
  day: /^(sun|sunday|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday|日|日曜|月|月曜|火|火曜|水|水曜|木|木曜|金|金曜|土|土曜)\s/i,
};

const days = [
  ["sun", "sunday", "日", "日曜"],
  ["mon", "monday", "月", "月曜"],
  ["tue", "tuesday", "火", "火曜"],
  ["wed", "wednesday", "水", "水曜"],
  ["thu", "thursday", "木", "木曜"],
  ["fri", "friday", "金", "金曜"],
  ["sat", "saturday", "土", "土曜"],
];

export function extractScheduleFromText(
  text: string,
  referenceDate: Date,
): {
  raw: string;
  text: string;
  date: Date | null;
} {
  let txt = text;
  let date = null;

  if (regexps.today.test(text)) {
    const match = text.match(regexps.today);
    txt = text.replace(match[0], "");

    date = add(referenceDate, { days: 0 });
  } else if (regexps.tomorrow.test(text)) {
    const match = text.match(regexps.tomorrow);
    txt = text.replace(match[0], "");

    date = add(referenceDate, { days: 1 });
  } else if (regexps.date.test(text)) {
    const match = text.match(regexps.date);
    txt = text.replace(match[0], "");
    const tmp = match[1].split(/(\/|\.|\-)/);
    date = new Date(
      Date.parse(`${referenceDate.getFullYear()}-${Number(tmp[0])}-${tmp[2]}`),
    );
    if (
      isBefore(format(date, "yyyy-MM-dd"), format(referenceDate, "yyyy-MM-dd"))
    ) {
      date = add(date, { years: 1 });
    }
  } else if (regexps.day.test(text)) {
    const match = text.match(regexps.day);
    txt = text.replace(match[0], "");
    let idx: Day = 0;
    for (let i = 0; i < days.length; i += 1) {
      if (days[i].includes(match[1].toLowerCase())) {
        idx = i as Day;
        break;
      }
    }
    date = nextDay(referenceDate, idx);
  }

  if (date && Number.isNaN(date.getTime())) {
    txt = text;
    date = null;
  }

  return {
    raw: text,
    text: txt,
    date,
  };
}
