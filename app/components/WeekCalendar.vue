<script setup lang="ts">
import { addDays, startOfDay } from "date-fns";
import type { TimeEntry, DateRangePreset } from "~/types";
import {
  weekStart as toWeekStart,
  weekEnd as toWeekEnd,
  weekDays,
  nextWeek,
  previousWeek,
  formatWeekRange,
  formatDayHeader,
  isSameDay,
} from "~/utils/week";
import { toDateInput, fromDateInput } from "~/utils/date";

const ROW_HEIGHT = 48; // px per hour

const { activeClients, getById } = useClients();
const { entries, createManual, update } = useTimeEntries();
const { settings } = useSettings();
const now = useNow();

// The calendar's drag-to-create/move/resize snapping granularity is also
// the smallest block a drag can create — both driven by the same setting.
const snapMinutes = computed(() => settings.value.snapMinutes);

const anchor = ref(toWeekStart(new Date(), settings.value.weekStartsOn));
const days = computed(() => weekDays(anchor.value));

// Keep the currently-displayed week's start aligned with the convention
// (Mon/Sun) if the user changes it while viewing the calendar.
watch(() => settings.value.weekStartsOn, (weekStartsOn) => {
  anchor.value = toWeekStart(anchor.value, weekStartsOn);
});

function goPrev() {
  anchor.value = previousWeek(anchor.value);
}
function goNext() {
  anchor.value = nextWeek(anchor.value);
}
const weekRange = computed(() => ({
  start: toDateInput(anchor.value),
  end: toDateInput(addDays(anchor.value, 6)),
}));
function onWeekRangeChange(range: { start: string; end: string }) {
  anchor.value = fromDateInput(range.start);
}
const weekPresets: DateRangePreset[] = [
  {
    label: "This week",
    range: () => {
      const today = new Date();
      return {
        start: toDateInput(toWeekStart(today, settings.value.weekStartsOn)),
        end: toDateInput(toWeekEnd(today, settings.value.weekStartsOn)),
      };
    },
  },
];

function hourLabel(hour: number): string {
  if (settings.value.timeFormat === "12h") {
    const period = hour < 12 ? "AM" : "PM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour} ${period}`;
  }
  return `${String(hour).padStart(2, "0")}:00`;
}

const clientItems = computed(() => [
  {
    label: "No client",
    value: null as string | null,
    color: null as string | null,
  },
  ...activeClients.value.map((c) => ({
    label: c.name,
    value: c.id,
    color: c.color,
  })),
]);

// --- segments: split each entry into per-day visual pieces -----------------

interface Segment {
  key: string;
  entryId: string;
  dayIndex: number;
  startMin: number;
  endMin: number;
  isStart: boolean;
  isEnd: boolean;
  entry: TimeEntry;
}

const allSegments = computed<Segment[]>(() => {
  const result: Segment[] = [];
  for (const entry of entries.value) {
    const entryStart = new Date(entry.start);
    const entryEnd = entry.end ? new Date(entry.end) : now.value;
    for (let i = 0; i < 7; i++) {
      const dayStart = startOfDay(days.value[i]!);
      const dayEnd = addDays(dayStart, 1);
      const segStart = entryStart < dayStart ? dayStart : entryStart;
      const segEnd = entryEnd > dayEnd ? dayEnd : entryEnd;
      if (segStart.getTime() >= segEnd.getTime()) continue;
      result.push({
        key: `${entry.id}-${i}`,
        entryId: entry.id,
        dayIndex: i,
        startMin: (segStart.getTime() - dayStart.getTime()) / 60000,
        endMin: (segEnd.getTime() - dayStart.getTime()) / 60000,
        isStart: segStart.getTime() === entryStart.getTime(),
        isEnd: entry.end !== null && segEnd.getTime() === entryEnd.getTime(),
        entry,
      });
    }
  }
  return result;
});

function segmentsForDay(dayIndex: number) {
  return allSegments.value.filter((s) => {
    if (s.dayIndex !== dayIndex) return false;
    // Hide the entry from its original day while it's being dragged to a
    // different one; the drag preview block below renders it there instead.
    if (
      liveOverride.value
      && liveOverride.value.entryId === s.entryId
      && liveOverride.value.dayIndex !== dayIndex
    )
      return false;
    return true;
  });
}

// --- geometry helpers --------------------------------------------------

const gridEl = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, step = snapMinutes.value) {
  return Math.round(value / step) * step;
}

function yToMinutes(clientY: number): number {
  const rect = gridEl.value!.getBoundingClientRect();
  const y = clientY - rect.top;
  return clamp((y / ROW_HEIGHT) * 60, 0, 24 * 60);
}

const GUTTER_WIDTH = 48;

function xToDayIndex(clientX: number): number {
  const rect = gridEl.value!.getBoundingClientRect();
  const dayWidth = (rect.width - GUTTER_WIDTH) / 7;
  const x = clientX - rect.left - GUTTER_WIDTH;
  return clamp(Math.floor(x / dayWidth), 0, 6);
}

function styleFor(startMin: number, endMin: number) {
  const top = (startMin / 60) * ROW_HEIGHT;
  const height = Math.max(((endMin - startMin) / 60) * ROW_HEIGHT, 6);
  return { top: `${top}px`, height: `${height}px` };
}

function minutesToIso(day: Date, minutes: number): string {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setTime(d.getTime() + minutes * 60000);
  return d.toISOString();
}

function entryColor(entry: TimeEntry): string | null {
  return getById(entry.clientId)?.color ?? null;
}

// --- drag: create ---------------------------------------------------------

interface CreatePreview {
  dayIndex: number;
  startMin: number;
  endMin: number;
}

const createPreview = ref<CreatePreview | null>(null);
const createPopoverOpen = ref(false);
const createTitle = ref("");
const createClientId = ref<string | null>(null);

interface CreateDrag {
  dayIndex: number;
  anchorMin: number;
  moved: boolean;
}
let createDrag: CreateDrag | null = null;

function onBackgroundPointerDown(dayIndex: number, event: PointerEvent) {
  if (createPopoverOpen.value) return;
  const anchorMin = snap(yToMinutes(event.clientY));
  createDrag = { dayIndex, anchorMin, moved: false };
  createPreview.value = {
    dayIndex,
    startMin: anchorMin,
    endMin: anchorMin + snapMinutes.value,
  };
  window.addEventListener("pointermove", onCreatePointerMove);
  window.addEventListener("pointerup", onCreatePointerUp, { once: true });
}

function onCreatePointerMove(event: PointerEvent) {
  if (!createDrag) return;
  const current = snap(yToMinutes(event.clientY));
  if (current !== createDrag.anchorMin) createDrag.moved = true;
  const start = Math.min(createDrag.anchorMin, current);
  const end = Math.max(createDrag.anchorMin, current, start + snapMinutes.value);
  createPreview.value = {
    dayIndex: createDrag.dayIndex,
    startMin: start,
    endMin: end,
  };
}

function onCreatePointerUp() {
  window.removeEventListener("pointermove", onCreatePointerMove);
  if (!createDrag || !createPreview.value) {
    createDrag = null;
    return;
  }
  createDrag = null;
  createTitle.value = "";
  createClientId.value = null;
  createPopoverOpen.value = true;
}

function confirmCreate() {
  if (!createPreview.value) return;
  const day = days.value[createPreview.value.dayIndex]!;
  createManual({
    title: createTitle.value.trim(),
    clientId: createClientId.value,
    start: minutesToIso(day, createPreview.value.startMin),
    end: minutesToIso(day, createPreview.value.endMin),
  });
  cancelCreate();
}

function cancelCreate() {
  createPopoverOpen.value = false;
}

watch(createPopoverOpen, (open) => {
  if (!open) createPreview.value = null;
});

// --- drag: move & resize ---------------------------------------------------

type AdjustMode = "move" | "resize-top" | "resize-bottom";

interface AdjustDrag {
  mode: AdjustMode;
  entryId: string;
  dayIndex: number;
  originStart: number;
  originEnd: number;
  pointerStartY: number;
  pointerStartX: number;
  moved: boolean;
}
let adjustDrag: AdjustDrag | null = null;
const liveOverride = ref<{
  entryId: string;
  dayIndex: number;
  startMin: number;
  endMin: number;
} | null>(null);
const draggedEntry = computed(() => {
  if (!liveOverride.value) return null;
  return (
    entries.value.find((e) => e.id === liveOverride.value!.entryId) ?? null
  );
});

const editingEntry = ref<TimeEntry | null>(null);
const editModalOpen = ref(false);

function openEdit(entry: TimeEntry) {
  editingEntry.value = entry;
  editModalOpen.value = true;
}

function onEntryPointerDown(seg: Segment, event: PointerEvent) {
  event.stopPropagation();

  // Only single-day segments of finished entries can be dragged directly;
  // running entries and multi-day segments (e.g. a 24h auto-stopped entry
  // crossing midnight) just open the edit modal on click instead.
  const draggable = seg.isStart && seg.isEnd && seg.entry.end !== null;
  if (!draggable) {
    window.addEventListener("pointerup", () => openEdit(seg.entry), {
      once: true,
    });
    return;
  }

  adjustDrag = {
    mode: "move",
    entryId: seg.entryId,
    dayIndex: seg.dayIndex,
    originStart: seg.startMin,
    originEnd: seg.endMin,
    pointerStartY: event.clientY,
    pointerStartX: event.clientX,
    moved: false,
  };
  liveOverride.value = {
    entryId: seg.entryId,
    dayIndex: seg.dayIndex,
    startMin: seg.startMin,
    endMin: seg.endMin,
  };
  window.addEventListener("pointermove", onAdjustPointerMove);
  window.addEventListener("pointerup", onAdjustPointerUp, { once: true });
}

function onResizeStart(
  seg: Segment,
  edge: "top" | "bottom",
  event: PointerEvent,
) {
  if (seg.entry.end === null || !seg.isStart || !seg.isEnd) return;
  event.stopPropagation();
  adjustDrag = {
    mode: edge === "top" ? "resize-top" : "resize-bottom",
    entryId: seg.entryId,
    dayIndex: seg.dayIndex,
    originStart: seg.startMin,
    originEnd: seg.endMin,
    pointerStartY: event.clientY,
    pointerStartX: event.clientX,
    moved: false,
  };
  liveOverride.value = {
    entryId: seg.entryId,
    dayIndex: seg.dayIndex,
    startMin: seg.startMin,
    endMin: seg.endMin,
  };
  window.addEventListener("pointermove", onAdjustPointerMove);
  window.addEventListener("pointerup", onAdjustPointerUp, { once: true });
}

function onAdjustPointerMove(event: PointerEvent) {
  if (!adjustDrag) return;
  const pixelDeltaY = event.clientY - adjustDrag.pointerStartY;
  const pixelDeltaX = event.clientX - adjustDrag.pointerStartX;
  if (Math.abs(pixelDeltaY) > 2 || Math.abs(pixelDeltaX) > 2)
    adjustDrag.moved = true;
  const deltaMin = snap((pixelDeltaY / ROW_HEIGHT) * 60);

  let startMin = adjustDrag.originStart;
  let endMin = adjustDrag.originEnd;
  const duration = adjustDrag.originEnd - adjustDrag.originStart;

  if (adjustDrag.mode === "move") {
    startMin = clamp(adjustDrag.originStart + deltaMin, 0, 24 * 60 - duration);
    endMin = startMin + duration;
    adjustDrag.dayIndex = xToDayIndex(event.clientX);
  } else if (adjustDrag.mode === "resize-top") {
    startMin = clamp(
      adjustDrag.originStart + deltaMin,
      0,
      adjustDrag.originEnd - snapMinutes.value,
    );
    endMin = adjustDrag.originEnd;
  } else {
    endMin = clamp(
      adjustDrag.originEnd + deltaMin,
      adjustDrag.originStart + snapMinutes.value,
      24 * 60,
    );
    startMin = adjustDrag.originStart;
  }

  liveOverride.value = {
    entryId: adjustDrag.entryId,
    dayIndex: adjustDrag.dayIndex,
    startMin,
    endMin,
  };
}

function onAdjustPointerUp() {
  window.removeEventListener("pointermove", onAdjustPointerMove);
  if (!adjustDrag) return;

  const drag = adjustDrag;
  adjustDrag = null;

  if (!drag.moved) {
    liveOverride.value = null;
    const entry = entries.value.find((e) => e.id === drag.entryId);
    if (entry) openEdit(entry);
    return;
  }

  const override = liveOverride.value;
  liveOverride.value = null;
  if (!override) return;

  const day = days.value[drag.dayIndex]!;
  update(drag.entryId, {
    start: minutesToIso(day, override.startMin),
    end: minutesToIso(day, override.endMin),
  });
}

function segStyle(seg: Segment) {
  if (liveOverride.value && liveOverride.value.entryId === seg.entryId) {
    return styleFor(liveOverride.value.startMin, liveOverride.value.endMin);
  }
  return styleFor(seg.startMin, seg.endMin);
}

const nowTopPx = computed(
  () =>
    ((now.value.getHours() * 60 + now.value.getMinutes()) / 60) * ROW_HEIGHT,
);

// --- scroll so the current time is centered on mount ------------------------

onMounted(() => {
  if (!scrollEl.value) return;
  const target = nowTopPx.value - scrollEl.value.clientHeight / 2;
  scrollEl.value.scrollTop = Math.max(0, target);
});
</script>

<template>
  <div
    class="flex flex-col flex-1 rounded-xl overflow-hidden bg-white/95 dark:bg-black/50 backdrop-blur-lg ring ring-default m-6"
  >
    <div class="shrink-0">
      <TimerBar />

      <div
        class="flex items-center justify-between px-4 py-3 border-b border-default"
      >
        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Previous week"
            @click="goPrev"
          />
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Next week"
            @click="goNext"
          />
        </div>
        <DateRangeButton
          :model-value="weekRange"
          :presets="weekPresets"
          week-mode
          :format-range="(start) => formatWeekRange(start)"
          @update:model-value="onWeekRangeChange"
        />
      </div>

      <div
        class="grid border-b border-default"
        style="grid-template-columns: 48px repeat(7, 1fr)"
      >
        <div />
        <div
          v-for="day in days"
          :key="day.toISOString()"
          class="flex flex-col items-center gap-1 py-2.5"
        >
          <p class="text-xs uppercase tracking-wide text-muted">
            {{ formatDayHeader(day).weekday }}
          </p>
          <p
            class="flex items-center justify-center size-7 rounded-full text-sm font-semibold"
            :class="
              isSameDay(day, now)
                ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                : 'text-highlighted'
            "
          >
            {{ formatDayHeader(day).day }}
          </p>
        </div>
      </div>
    </div>

    <div
      ref="scrollEl"
      class="flex-1 min-h-0 overflow-y-auto bg-neutral-100 dark:bg-neutral-900"
    >
      <div
        ref="gridEl"
        class="grid relative select-none"
        style="grid-template-columns: 48px repeat(7, 1fr); height: 1152px"
      >
        <div class="relative">
          <span
            v-for="h in 24"
            :key="h"
            class="absolute right-2 -translate-y-1/2 text-xs text-muted"
            :style="{ top: `${(h - 1) * ROW_HEIGHT}px` }"
          ><span v-if="h > 1">{{ hourLabel(h - 1) }}</span></span>
        </div>

        <div
          v-for="(day, dayIndex) in days"
          :key="day.toISOString()"
          class="relative border-l border-default touch-none"
          @pointerdown="onBackgroundPointerDown(dayIndex, $event)"
        >
          <div
            v-for="h in 24"
            :key="h"
            class="absolute inset-x-0 border-t border-default/60"
            :style="{ top: `${(h - 1) * ROW_HEIGHT}px` }"
          />

          <div
            v-if="isSameDay(day, now)"
            class="absolute inset-x-0 h-[1px] bg-primary z-20 pointer-events-none"
            :style="{ top: `${nowTopPx}px` }"
          >
            <span
              class="absolute -left-1 -top-1 size-2 rounded-full bg-primary"
            />
          </div>

          <div
            v-for="seg in segmentsForDay(dayIndex)"
            :key="seg.key"
            class="absolute inset-x-0.5 rounded-lg p-2 overflow-hidden z-10 shadow-sm"
            :class="[
              seg.entry.end === null ? 'ring-2 ring-primary' : '',
              seg.entry.autoStopped24h ? 'ring-2 ring-error' : '',
              seg.isStart && seg.isEnd && seg.entry.end !== null
                ? 'cursor-grab'
                : 'cursor-default',
            ]"
            :style="{
              ...segStyle(seg),
              backgroundColor: entryColor(seg.entry)
                ? `color-mix(in srgb, ${entryColor(seg.entry)} 30%, white)`
                : 'var(--ui-bg-elevated)',
            }"
            @pointerdown="onEntryPointerDown(seg, $event)"
          >
            <p class="text-xs font-semibold truncate text-neutral-800">
              {{ seg.entry.title || "Untitled" }}
            </p>
            <p
              v-if="getById(seg.entry.clientId)"
              class="text-[11px] text-neutral-600 truncate"
            >
              {{ getById(seg.entry.clientId)?.name }}
            </p>
            <UIcon
              v-if="seg.entry.autoStopped24h"
              name="i-lucide-triangle-alert"
              class="absolute top-1 right-1 size-2.5 text-error"
            />

            <template v-if="seg.isStart && seg.isEnd">
              <div
                class="absolute inset-x-0 top-0 h-1.5 cursor-ns-resize"
                @pointerdown="onResizeStart(seg, 'top', $event)"
              />
              <div
                class="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
                @pointerdown="onResizeStart(seg, 'bottom', $event)"
              />
            </template>
          </div>

          <div
            v-if="
              draggedEntry
                && liveOverride
                && liveOverride.dayIndex === dayIndex
                && !segmentsForDay(dayIndex).some(
                  (s) => s.entryId === liveOverride!.entryId,
                )
            "
            class="absolute inset-x-0.5 rounded-lg px-2 py-1 overflow-hidden z-20 shadow-sm ring-2 ring-primary pointer-events-none"
            :style="{
              ...styleFor(liveOverride.startMin, liveOverride.endMin),
              backgroundColor: entryColor(draggedEntry)
                ? `color-mix(in srgb, ${entryColor(draggedEntry)} 24%, white)`
                : 'var(--ui-bg-elevated)',
            }"
          >
            <p class="text-xs font-semibold truncate text-neutral-800">
              {{ draggedEntry.title || "Untitled" }}
            </p>
            <p
              v-if="getById(draggedEntry.clientId)"
              class="text-[11px] text-neutral-600 truncate"
            >
              {{ getById(draggedEntry.clientId)?.name }}
            </p>
          </div>

          <UPopover
            v-if="createPreview && createPreview.dayIndex === dayIndex"
            v-model:open="createPopoverOpen"
          >
            <div
              class="absolute inset-x-0.5 rounded-lg border-2 border-dashed border-primary bg-primary/10 z-30"
              :style="styleFor(createPreview.startMin, createPreview.endMin)"
            />
            <template #content>
              <div class="p-3 flex flex-col gap-3 w-64">
                <UFormField label="Title">
                  <UInput
                    v-model="createTitle"
                    placeholder="What did you work on?"
                    class="w-full"
                    autofocus
                    @keydown.enter="confirmCreate"
                  />
                </UFormField>
                <UFormField label="Client">
                  <USelectMenu
                    v-model="createClientId"
                    :items="clientItems"
                    value-key="value"
                    label-key="label"
                    searchable
                    placeholder="No client"
                    class="w-full"
                    :ui="{ item: 'items-center' }"
                  >
                    <template #leading="{ modelValue }">
                      <span
                        v-if="getById(modelValue as string)"
                        class="size-2.5 rounded-full shrink-0"
                        :style="{
                          backgroundColor: getById(modelValue as string)?.color,
                        }"
                      />
                      <span
                        v-else
                        class="size-2.5 rounded-full shrink-0 border border-dashed border-zinc-400"
                      />
                    </template>
                    <template #item-leading="{ item }">
                      <span
                        v-if="item.color"
                        class="size-2.5 rounded-full shrink-0"
                        :style="{ backgroundColor: item.color }"
                      />
                      <span
                        v-else
                        class="size-2.5 rounded-full shrink-0 border border-dashed border-zinc-400"
                      />
                    </template>
                  </USelectMenu>
                </UFormField>
                <div class="flex justify-end gap-2">
                  <UButton
                    label="Cancel"
                    size="sm"
                    color="neutral"
                    variant="ghost"
                    @click="cancelCreate"
                  />
                  <UButton
                    label="Create"
                    size="sm"
                    @click="confirmCreate"
                  />
                </div>
              </div>
            </template>
          </UPopover>
        </div>
      </div>
    </div>
  </div>

  <EntryEditModal
    v-model:open="editModalOpen"
    :entry="editingEntry"
  />
</template>
