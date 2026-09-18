export interface Client {
  id: string
  name: string
  hourlyRate: number
  color: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface TimeEntry {
  id: string
  title: string
  clientId: string | null
  start: string
  end: string | null
  rateSnapshot: number | null
  autoStopped24h: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientRow {
  id: string
  name: string
  hourly_rate: number
  color: string
  archived: number
  created_at: string
  updated_at: string
}

export interface TimeEntryRow {
  id: string
  title: string
  client_id: string | null
  start: string
  end: string | null
  rate_snapshot: number | null
  auto_stopped_24h: number
  created_at: string
  updated_at: string
}

export function clientFromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    hourlyRate: row.hourly_rate,
    color: row.color,
    archived: !!row.archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
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
    updatedAt: row.updated_at
  }
}

export type ConnectionStatus
  = | 'idle'
    | 'checking'
    | 'unsupported'
    | 'setup'
    | 'needs-reconnect'
    | 'connecting'
    | 'connected'
    | 'error'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
