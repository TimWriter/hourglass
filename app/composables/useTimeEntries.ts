import { timeEntryFromRow, type TimeEntry, type TimeEntryRow } from "~/types";

const entries = ref<TimeEntry[]>([]);

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function useTimeEntries() {
  const { query, mutate, ready } = useDatabase();
  const { getById } = useClients();

  function refresh() {
    if (!ready.value) {
      entries.value = [];
      return;
    }
    const rows = query<TimeEntryRow>("SELECT * FROM time_entries ORDER BY start ASC");
    entries.value = rows.map(timeEntryFromRow);
  }

  const runningEntry = computed(() => entries.value.find((e) => e.end === null) ?? null);

  function start(title: string, clientId: string | null) {
    if (runningEntry.value) stop(runningEntry.value.id);
    const client = getById(clientId);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mutate(
      `INSERT INTO time_entries (id, title, client_id, start, end, rate_snapshot, auto_stopped_24h, created_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, ?, 0, ?, ?)`,
      [id, title, clientId, now, client ? client.hourlyRate : null, now, now],
    );
    refresh();
    return id;
  }

  function stop(id: string, end?: string) {
    const endIso = end ?? new Date().toISOString();
    mutate(
      "UPDATE time_entries SET end = ?, updated_at = ? WHERE id = ?",
      [endIso, new Date().toISOString(), id],
    );
    refresh();
  }

  function createManual(data: { title: string; clientId: string | null; start: string; end: string }) {
    const client = getById(data.clientId);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mutate(
      `INSERT INTO time_entries (id, title, client_id, start, end, rate_snapshot, auto_stopped_24h, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, data.title, data.clientId, data.start, data.end, client ? client.hourlyRate : null, now, now],
    );
    refresh();
    return id;
  }

  function update(id: string, data: Partial<{
    title: string;
    clientId: string | null;
    start: string;
    end: string | null;
    rateSnapshot: number | null;
  }>) {
    const existing = entries.value.find((e) => e.id === id);
    if (!existing) return;
    const next = { ...existing, ...data };

    let rateSnapshot = next.rateSnapshot;
    if (data.clientId !== undefined && data.rateSnapshot === undefined) {
      const client = getById(data.clientId);
      rateSnapshot = client ? client.hourlyRate : null;
    }

    const now = new Date().toISOString();
    mutate(
      `UPDATE time_entries SET title = ?, client_id = ?, start = ?, end = ?, rate_snapshot = ?, auto_stopped_24h = 0, updated_at = ?
       WHERE id = ?`,
      [next.title, next.clientId, next.start, next.end, rateSnapshot, now, id],
    );
    refresh();
  }

  function remove(id: string) {
    mutate("DELETE FROM time_entries WHERE id = ?", [id]);
    refresh();
  }

  function checkAutoStop() {
    if (!ready.value) return;
    const running = runningEntry.value;
    if (!running) return;
    const startMs = new Date(running.start).getTime();
    if (Date.now() - startMs >= TWENTY_FOUR_HOURS_MS) {
      const endIso = new Date(startMs + TWENTY_FOUR_HOURS_MS).toISOString();
      mutate(
        "UPDATE time_entries SET end = ?, auto_stopped_24h = 1, updated_at = ? WHERE id = ?",
        [endIso, new Date().toISOString(), running.id],
      );
      refresh();
    }
  }

  return {
    entries,
    runningEntry,
    refresh,
    start,
    stop,
    createManual,
    update,
    remove,
    checkAutoStop,
  };
}
