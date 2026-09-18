import type { ConnectionStatus, SaveState } from "~/types";
import type { Database, SqlJsStatic } from "sql.js";
import { get, set } from "idb-keyval";

// Import the concrete build directly (bypassing the package's "browser"
// export condition, which resolves to a differently-named .wasm file).
import initSqlJs from "sql.js/dist/sql-wasm.js";
// Inlined by Vite as a base64 data: URI (see assetsInlineLimit in
// nuxt.config.ts) and decoded below so sql.js never has to fetch() its
// wasm binary — file:// pages can't fetch local files at all in Chrome.
import wasmDataUri from "sql.js/dist/sql-wasm.wasm?url";

const HANDLE_KEY = "timetrack-db-file-handle";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hourly_rate REAL NOT NULL,
  color TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  client_id TEXT REFERENCES clients(id),
  start TEXT NOT NULL,
  end TEXT,
  rate_snapshot REAL,
  auto_stopped_24h INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

let sqlPromise: Promise<SqlJsStatic> | null = null;

function decodeWasmDataUri(dataUri: string): ArrayBuffer {
  const base64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function loadSqlJs() {
  sqlPromise ??= initSqlJs({
    wasmBinary: decodeWasmDataUri(wasmDataUri),
  }).catch((e) => {
    sqlPromise = null;
    throw e;
  });
  return sqlPromise;
}

function ensureSchema(database: Database) {
  database.run(SCHEMA_SQL);
  const res = database.exec(
    "SELECT value FROM meta WHERE key = 'schema_version'",
  );
  if (!res.length) {
    database.run(
      "INSERT INTO meta (key, value) VALUES ('schema_version', '1')",
    );
  }
}

// Module-level singleton state — this app is client-only, so a plain
// module scope ref is sufficient (and simpler than useState, since a
// sql.js Database instance is not serializable).
const db = ref<Database | null>(null);
const fileHandle = ref<FileSystemFileHandle | null>(null);
const fileName = ref("");
const status = ref<ConnectionStatus>("idle");
const saveState = ref<SaveState>("idle");
const errorMessage = ref("");

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushing = false;
let pendingFlush = false;
let listenersAttached = false;

async function flush() {
  if (!db.value || !fileHandle.value) return;
  if (isFlushing) {
    pendingFlush = true;
    return;
  }
  isFlushing = true;
  saveState.value = "saving";
  try {
    const data = db.value.export();
    const writable = await fileHandle.value.createWritable();
    await writable.write(data as unknown as BufferSource);
    await writable.close();
    saveState.value = "saved";
  } catch (e) {
    console.error("Failed to write database file", e);
    saveState.value = "error";
  } finally {
    isFlushing = false;
    if (pendingFlush) {
      pendingFlush = false;
      void flush();
    }
  }
}

function scheduleSave(delay = 400) {
  saveState.value = "saving";
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, delay);
}

function flushNow() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  void flush();
}

function attachLifecycleListeners() {
  if (listenersAttached || !import.meta.client) return;
  listenersAttached = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && debounceTimer) flushNow();
  });
  window.addEventListener("beforeunload", () => {
    if (debounceTimer) flushNow();
  });
}

async function initFromBytes(bytes: Uint8Array) {
  const SQL = await loadSqlJs();
  const database = bytes.length ? new SQL.Database(bytes) : new SQL.Database();
  ensureSchema(database);
  db.value = database;
}

async function loadFromHandle(handle: FileSystemFileHandle) {
  status.value = "connecting";
  errorMessage.value = "";
  try {
    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    await initFromBytes(new Uint8Array(buffer));
    fileHandle.value = handle;
    fileName.value = handle.name;
    try {
      // Best-effort: remembering the handle just saves a reconnect click
      // next time. If IndexedDB is unavailable (e.g. private browsing),
      // the database we just opened should still work for this session.
      await set(HANDLE_KEY, handle);
    } catch (e) {
      console.warn(
        "Could not remember the database file handle for next time",
        e,
      );
    }
    attachLifecycleListeners();
    status.value = "connected";
    saveState.value = "saved";
  } catch (e) {
    console.error("Failed to load database file", e);
    errorMessage.value =
      e instanceof Error
        ? e.message
        : "Unknown error while opening the database file.";
    status.value = "error";
  }
}

async function init() {
  if (!import.meta.client) return;
  if (!("showSaveFilePicker" in window)) {
    status.value = "unsupported";
    return;
  }
  status.value = "checking";
  try {
    const handle = await get<FileSystemFileHandle>(HANDLE_KEY);
    if (!handle) {
      status.value = "setup";
      return;
    }
    const permission = await handle.queryPermission({ mode: "readwrite" });
    if (permission === "granted") {
      await loadFromHandle(handle);
    } else if (permission === "prompt") {
      fileHandle.value = handle;
      fileName.value = handle.name;
      status.value = "needs-reconnect";
    } else {
      status.value = "setup";
    }
  } catch (e) {
    console.error("Failed to check for an existing database handle", e);
    status.value = "setup";
  }
}

async function reconnect() {
  if (!fileHandle.value) return;
  try {
    const permission = await fileHandle.value.requestPermission({
      mode: "readwrite",
    });
    if (permission === "granted") {
      await loadFromHandle(fileHandle.value);
    }
  } catch (e) {
    console.error("Failed to reconnect to the database file", e);
    errorMessage.value =
      e instanceof Error
        ? e.message
        : "Could not reconnect to the database file.";
    status.value = "error";
  }
}

async function createNew() {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "hourglass.sqlite",
      types: [
        {
          description: "SQLite database",
          accept: { "application/x-sqlite3": [".sqlite"] },
        },
      ],
    });
    await loadFromHandle(handle);
    flushNow();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return;
    console.error("Failed to create a new database file", e);
    errorMessage.value =
      e instanceof Error ? e.message : "Could not create the database file.";
    status.value = "error";
  }
}

async function openExisting() {
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: "SQLite database",
          accept: { "application/x-sqlite3": [".sqlite"] },
        },
      ],
    });
    if (!handle) return;
    await loadFromHandle(handle);
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return;
    console.error("Failed to open an existing database file", e);
    errorMessage.value =
      e instanceof Error ? e.message : "Could not open the database file.";
    status.value = "error";
  }
}

function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = [],
): T[] {
  if (!db.value) return [];
  const stmt = db.value.prepare(sql);
  try {
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as T);
    }
    return rows;
  } finally {
    stmt.free();
  }
}

function mutate(sql: string, params: (string | number | null)[] = []) {
  if (!db.value) return;
  db.value.run(sql, params);
  scheduleSave();
}

export function useDatabase() {
  const ready = computed(() => status.value === "connected" && !!db.value);

  return {
    status,
    saveState,
    errorMessage,
    fileName,
    ready,
    init,
    createNew,
    openExisting,
    reconnect,
    query,
    mutate,
    flushNow,
  };
}
