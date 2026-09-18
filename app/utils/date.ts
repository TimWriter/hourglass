import { CalendarDate, type DateValue } from "@internationalized/date";

// Plain 'yyyy-MM-dd' strings are this app's convention for date-only values
// (native <input type="date">, SQL query params, ...). These converters are
// shared so every place doing Date <-> string <-> CalendarDate agrees on the
// same (timezone-safe, local-time) interpretation.

export function toDateInput(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Parses a 'yyyy-MM-dd' string as local midnight (not UTC, unlike `new Date(str)`). */
export function fromDateInput(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? new Date().getFullYear(), (m ?? 1) - 1, d ?? 1);
}

export function toCalendarDate(value: string): CalendarDate {
  const [y, m, d] = value.split("-").map(Number);
  return new CalendarDate(y ?? new Date().getFullYear(), m ?? 1, d ?? 1);
}

export function calendarDateToInput(value: DateValue): string {
  return [
    value.year.toString().padStart(4, "0"),
    value.month.toString().padStart(2, "0"),
    value.day.toString().padStart(2, "0"),
  ].join("-");
}
