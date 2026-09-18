import {
  eachDayOfInterval,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  isWeekend,
} from "date-fns";
import type { TimeEntry } from "~/types";
import { entryDurationMs, msToHours } from "./format";

export function entriesInRange(
  entries: TimeEntry[],
  start: Date,
  end: Date,
  clientId?: string | "all" | null,
): TimeEntry[] {
  return entries.filter((e) => {
    const entryStart = new Date(e.start);
    if (!isWithinInterval(entryStart, { start, end })) return false;
    if (clientId && clientId !== "all") {
      return e.clientId === clientId;
    }
    return true;
  });
}

export function totalHours(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + msToHours(entryDurationMs(e.start, e.end)), 0);
}

export function totalRevenue(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => {
    if (e.rateSnapshot == null) return sum;
    return sum + msToHours(entryDurationMs(e.start, e.end)) * e.rateSnapshot;
  }, 0);
}

export function countWeekdays(start: Date, end: Date): number {
  if (start > end) return 0;
  return eachDayOfInterval({ start, end }).filter((d) => !isWeekend(d)).length;
}

export interface MonthlyForecast {
  revenueSoFar: number;
  dailyAvg: number;
  forecast: number;
  elapsedWorkdays: number;
  totalWorkdays: number;
}

/** Linear revenue forecast for the month containing `reference`, based on Mon–Fri workdays. */
export function monthlyForecast(entries: TimeEntry[], reference: Date): MonthlyForecast {
  const monthStart = startOfMonth(reference);
  const monthEnd = endOfMonth(reference);
  const today = startOfDay(reference);

  const elapsedEnd = today < monthEnd ? today : monthEnd;
  const elapsedWorkdays = countWeekdays(monthStart, elapsedEnd);
  const totalWorkdays = countWeekdays(monthStart, monthEnd);

  const monthEntries = entriesInRange(entries, monthStart, endOfDay(monthEnd));
  const revenueSoFar = totalRevenue(monthEntries);

  const dailyAvg = elapsedWorkdays > 0 ? revenueSoFar / elapsedWorkdays : 0;
  const forecast = dailyAvg * totalWorkdays;

  return { revenueSoFar, dailyAvg, forecast, elapsedWorkdays, totalWorkdays };
}

export interface BillingRow {
  date: Date;
  hours: number;
  amount: number;
}

export interface BillingResult {
  rows: BillingRow[];
  totalHours: number;
  totalAmount: number;
}

export function billingRows(entries: TimeEntry[], clientId: string, start: Date, end: Date): BillingResult {
  const inRange = entriesInRange(entries, start, endOfDay(end), clientId);
  const byDay = new Map<string, BillingRow>();

  for (const entry of inRange) {
    const day = startOfDay(new Date(entry.start));
    const key = day.toISOString();
    const hours = msToHours(entryDurationMs(entry.start, entry.end));
    const amount = hours * (entry.rateSnapshot ?? 0);
    const existing = byDay.get(key);
    if (existing) {
      existing.hours += hours;
      existing.amount += amount;
    } else {
      byDay.set(key, { date: day, hours, amount });
    }
  }

  const rows = Array.from(byDay.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  const totalHoursSum = rows.reduce((sum, r) => sum + r.hours, 0);
  const totalAmountSum = rows.reduce((sum, r) => sum + r.amount, 0);

  return { rows, totalHours: totalHoursSum, totalAmount: totalAmountSum };
}

export function roundUpToStep(hours: number, step = 0.25): number {
  if (step <= 0) return hours;
  return Math.ceil((hours - 1e-9) / step) * step;
}

/** Rounds each day's total hours up to the nearest `step` (default quarter hour), rescaling
 * that day's amount by its original effective rate so mixed rate_snapshots stay correct. */
export function applyDailyRoundUp(result: BillingResult, step = 0.25): BillingResult {
  const rows = result.rows.map((row) => {
    if (row.hours <= 0) return row;
    const roundedHours = roundUpToStep(row.hours, step);
    const effectiveRate = row.amount / row.hours;
    return { ...row, hours: roundedHours, amount: roundedHours * effectiveRate };
  });
  const totalHours = rows.reduce((sum, r) => sum + r.hours, 0);
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  return { rows, totalHours, totalAmount };
}
