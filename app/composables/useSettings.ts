import { DEFAULT_SETTINGS, type Settings } from "~/types";

const SETTINGS_KEY = "settings";

const settings = ref<Settings>({ ...DEFAULT_SETTINGS });

export function useSettings() {
  const { query, mutate, ready } = useDatabase();

  function refresh() {
    if (!ready.value) {
      settings.value = { ...DEFAULT_SETTINGS };
      return;
    }
    const rows = query<{ value: string }>("SELECT value FROM meta WHERE key = ?", [SETTINGS_KEY]);
    if (!rows.length) {
      settings.value = { ...DEFAULT_SETTINGS };
      return;
    }
    try {
      settings.value = { ...DEFAULT_SETTINGS, ...JSON.parse(rows[0]!.value) };
    } catch (e) {
      console.error("Failed to parse stored settings, falling back to defaults", e);
      settings.value = { ...DEFAULT_SETTINGS };
    }
  }

  function update(patch: Partial<Settings>) {
    settings.value = { ...settings.value, ...patch };
    mutate(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [SETTINGS_KEY, JSON.stringify(settings.value)],
    );
  }

  return { settings, refresh, update };
}
