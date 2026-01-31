export const formatDateValue = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateValue = (value: string) => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }
  return null;
};

export const formatDisplayDate = (dateString: string, language: string) => {
  const date = parseDateValue(dateString);
  if (!date) return null;
  try {
    return new Intl.DateTimeFormat(language, {
      month: "short",
      day: "numeric",
      weekday: "short",
    }).format(date);
  } catch {
    return dateString;
  }
};
