import { createGlobalState, useDocumentVisibility } from "@vueuse/core";

export interface IdleGap {
  entryId: string;
  hiddenAt: string;
  gapMs: number;
}

// createGlobalState so the detection watcher keeps running regardless of
// which page is currently mounted (idle time can easily span a navigation),
// mirroring useNow's reasoning for the same helper.
export const useIdleDetection = createGlobalState(() => {
  const pending = ref<IdleGap | null>(null);
  const visibility = useDocumentVisibility();
  let hiddenAtMs: number | null = null;

  watch(visibility, (value) => {
    if (value === "hidden") {
      hiddenAtMs = Date.now();
      return;
    }
    if (hiddenAtMs === null) return;
    const gapMs = Date.now() - hiddenAtMs;
    const hiddenAtIso = new Date(hiddenAtMs).toISOString();
    hiddenAtMs = null;

    const { settings } = useSettings();
    const thresholdMs = settings.value.idleThresholdMinutes * 60 * 1000;
    if (settings.value.idleThresholdMinutes <= 0 || gapMs < thresholdMs) return;

    const { runningEntry } = useTimeEntries();
    if (!runningEntry.value) return;

    pending.value = { entryId: runningEntry.value.id, hiddenAt: hiddenAtIso, gapMs };
  });

  function keep() {
    pending.value = null;
  }

  function discardAndContinue() {
    if (!pending.value) return;
    const { entryId, hiddenAt } = pending.value;
    const { runningEntry, stop, start } = useTimeEntries();
    const entry = runningEntry.value;
    if (entry && entry.id === entryId) {
      const { title, clientId } = entry;
      stop(entryId, hiddenAt);
      start(title, clientId);
    }
    pending.value = null;
  }

  return { pending, keep, discardAndContinue };
});
