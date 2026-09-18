import type { TimeFormat } from "~/types";

const hoursFormatter = new Intl.NumberFormat("de-AT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// A fresh Intl.NumberFormat per call is cheap relative to everything else
// going on (SQL queries, DOM updates) and keeps this in sync with the
// currency setting without needing to recreate a cached formatter whenever
// it changes.
export function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
}

/** The bare currency symbol/abbreviation (e.g. "€", "$", "CHF") for use outside Intl-formatted text. */
export function currencySymbol(currency: string): string {
  const formatted = (0).toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatted.replace(/[0-9\s]/g, "") || currency;
}

export function formatHours(hours: number): string {
  return `${hoursFormatter.format(hours)} h`;
}

export function msToHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatClock(date: Date, timeFormat: TimeFormat): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: timeFormat === "12h" });
}

export function entryDurationMs(start: string, end: string | null): number {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, endMs - startMs);
}
