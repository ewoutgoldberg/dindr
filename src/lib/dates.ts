import { format, startOfWeek, addDays } from "date-fns";

export const fmtDateKey = (d: Date) => format(d, "yyyy-MM-dd");
export const fmtDayShort = (d: Date) => format(d, "EEE");
export const fmtDayNum = (d: Date) => format(d, "d");
export const fmtDayLong = (d: Date) => format(d, "EEEE, MMM d");

export const getWeekDays = (anchor: Date = new Date()) => {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const CATEGORIES = [
  "Pasta", "Rice", "Salad", "Sushi", "Vegetarian", "Chicken", "Dessert",
] as const;

export const TIME_BUCKETS = [
  { label: "10–15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour+", value: 999 },
] as const;

export const DIFFICULTIES = [
  { label: "Easy", value: "easy" },
  { label: "Medium", value: "medium" },
  { label: "Advanced", value: "advanced" },
] as const;
