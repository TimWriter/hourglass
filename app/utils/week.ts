import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  isSameWeek,
  format,
} from "date-fns";

export const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function weekStart(date: Date): Date {
  return startOfWeek(date, WEEK_OPTIONS);
}

export function weekEnd(date: Date): Date {
  return endOfWeek(date, WEEK_OPTIONS);
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function nextWeek(start: Date): Date {
  return addWeeks(start, 1);
}

export function previousWeek(start: Date): Date {
  return addWeeks(start, -1);
}

export function isCurrentWeek(start: Date): boolean {
  return isSameWeek(start, new Date(), WEEK_OPTIONS);
}

export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${format(start, "d.")} – ${format(end, "d. MMMM yyyy")}`;
  }
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameYear) {
    return `${format(start, "d. MMM")} – ${format(end, "d. MMM yyyy")}`;
  }
  return `${format(start, "d. MMM yyyy")} – ${format(end, "d. MMM yyyy")}`;
}

export function formatDayHeader(date: Date): { weekday: string; day: string } {
  return {
    weekday: format(date, "EEE"),
    day: format(date, "d"),
  };
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
