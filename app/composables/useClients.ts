import { clientFromRow, type Client, type ClientRow } from "~/types";

const clients = ref<Client[]>([]);

export function useClients() {
  const { query, mutate, ready } = useDatabase();

  function refresh() {
    if (!ready.value) {
      clients.value = [];
      return;
    }
    const rows = query<ClientRow>(
      "SELECT * FROM clients ORDER BY archived ASC, name COLLATE NOCASE ASC",
    );
    clients.value = rows.map(clientFromRow);
  }

  const activeClients = computed(() => clients.value.filter((c) => !c.archived));
  const archivedClients = computed(() => clients.value.filter((c) => c.archived));

  function getById(id: string | null) {
    if (!id) return null;
    return clients.value.find((c) => c.id === id) ?? null;
  }

  function hasTimeEntries(id: string): boolean {
    const rows = query<{ count: number }>(
      "SELECT COUNT(*) as count FROM time_entries WHERE client_id = ?",
      [id],
    );
    return (rows[0]?.count ?? 0) > 0;
  }

  function create(data: { name: string; hourlyRate: number; color: string }) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    mutate(
      `INSERT INTO clients (id, name, hourly_rate, color, archived, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [id, data.name, data.hourlyRate, data.color, now, now],
    );
    refresh();
    return id;
  }

  function update(id: string, data: { name: string; hourlyRate: number; color: string }) {
    const now = new Date().toISOString();
    mutate(
      `UPDATE clients SET name = ?, hourly_rate = ?, color = ?, updated_at = ? WHERE id = ?`,
      [data.name, data.hourlyRate, data.color, now, id],
    );
    refresh();
  }

  function setArchived(id: string, archived: boolean) {
    const now = new Date().toISOString();
    mutate(
      "UPDATE clients SET archived = ?, updated_at = ? WHERE id = ?",
      [archived ? 1 : 0, now, id],
    );
    refresh();
  }

  function remove(id: string) {
    if (hasTimeEntries(id)) return false;
    mutate("DELETE FROM clients WHERE id = ?", [id]);
    refresh();
    return true;
  }

  return {
    clients,
    activeClients,
    archivedClients,
    refresh,
    getById,
    hasTimeEntries,
    create,
    update,
    setArchived,
    remove,
  };
}
