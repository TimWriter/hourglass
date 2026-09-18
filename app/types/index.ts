export interface Client {
  id: string;
  name: string;
  hourlyRate: number;
  color: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  title: string;
  clientId: string | null;
  start: string;
  end: string | null;
  rateSnapshot: number | null;
  autoStopped24h: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRow {
  id: string;
  name: string;
  hourly_rate: number;
  color: string;
  archived: number;
  created_at: string;
  updated_at: string;
}

export interface TimeEntryRow {
  id: string;
  title: string;
  client_id: string | null;
  start: string;
  end: string | null;
  rate_snapshot: number | null;
  auto_stopped_24h: number;
  created_at: string;
  updated_at: string;
}

export function clientFromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    hourlyRate: row.hourly_rate,
    color: row.color,
    archived: !!row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function timeEntryFromRow(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    title: row.title,
    clientId: row.client_id,
    start: row.start,
    end: row.end,
    rateSnapshot: row.rate_snapshot,
    autoStopped24h: !!row.auto_stopped_24h,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type TimeFormat = "24h" | "12h";
export type WeekStartsOn = 0 | 1;
export type DefaultPage = "track" | "clients" | "overview";

export interface Settings {
  timeFormat: TimeFormat;
  weekStartsOn: WeekStartsOn;
  currency: string;
  dateFormat: string;
  /** Hours: round each billing day's total up to this step (0 = off). */
  billingRoundingStep: number;
  /** Minutes: calendar drag-to-create/move/resize snapping granularity. */
  snapMinutes: number;
  defaultPage: DefaultPage;
  /** Hours a running timer is left before it's auto-stopped (0 = never). */
  autoStopHours: number;
}

export const DEFAULT_SETTINGS: Settings = {
  timeFormat: "24h",
  weekStartsOn: 1,
  currency: "EUR",
  dateFormat: "dd.MM.yyyy",
  billingRoundingStep: 0,
  snapMinutes: 15,
  defaultPage: "track",
  autoStopHours: 24,
};

export type ConnectionStatus
  = | "idle"
    | "checking"
    | "unsupported"
    | "setup"
    | "needs-reconnect"
    | "connecting"
    | "connected"
    | "error";

export type SaveState = "idle" | "saving" | "saved" | "error";
