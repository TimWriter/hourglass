<script setup lang="ts">
import type { DateValue } from "@internationalized/date";
import type { DateRange, DateRangePreset } from "~/types";
import { toCalendarDate, calendarDateToInput, toDateInput, fromDateInput } from "~/utils/date";
import { weekStart, weekEnd } from "~/utils/week";

// Matches reka-ui's own (unexported-to-us) RangeCalendar model value shape —
// `start`/`end` are individually undefined while the user has only picked
// one end of the range.
interface CalendarRangeValue {
  start: DateValue | undefined;
  end: DateValue | undefined;
}

const props = defineProps<{
  modelValue: DateRange;
  presets: DateRangePreset[];
  /** Calendar picks a single day; the emitted range snaps to that day's whole week. */
  weekMode?: boolean;
  formatRange: (start: Date, end: Date) => string;
}>();

const emit = defineEmits<{
  "update:modelValue": [DateRange];
}>();

const { settings } = useSettings();
const open = ref(false);

const activePreset = computed(() => {
  return props.presets.find((preset) => {
    const range = preset.range();
    return range.start === props.modelValue.start && range.end === props.modelValue.end;
  }) ?? null;
});

const displayLabel = computed(() => {
  if (activePreset.value) return activePreset.value.label;
  return props.formatRange(
    fromDateInput(props.modelValue.start),
    fromDateInput(props.modelValue.end),
  );
});

function applyPreset(preset: DateRangePreset) {
  emit("update:modelValue", preset.range());
  open.value = false;
}

// Two-endpoint range calendar (Overview's billing period). Read-only computed:
// Reka UI's range calendar reports partial selections (start set, end still
// undefined) through @update:model-value as the user clicks the first day,
// so this only emits (and closes the popover) once both ends are picked.
const calendarRange = computed<CalendarRangeValue>(() => ({
  start: toCalendarDate(props.modelValue.start),
  end: toCalendarDate(props.modelValue.end),
}));
function onRangeSelect(value: CalendarRangeValue | null | undefined) {
  if (!value?.start || !value?.end) return;
  emit("update:modelValue", {
    start: calendarDateToInput(value.start),
    end: calendarDateToInput(value.end),
  });
  open.value = false;
}

// Single-day calendar snapped to its containing week (Track).
const calendarSingle = computed<DateValue>({
  get: () => toCalendarDate(props.modelValue.start),
  set: (value) => {
    if (!value) return;
    const date = fromDateInput(calendarDateToInput(value));
    emit("update:modelValue", {
      start: toDateInput(weekStart(date, settings.value.weekStartsOn)),
      end: toDateInput(weekEnd(date, settings.value.weekStartsOn)),
    });
    open.value = false;
  },
});
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      :label="displayLabel"
      icon="i-lucide-calendar"
      color="neutral"
      variant="subtle"
    />

    <template #content>
      <div class="flex flex-col gap-2 p-2">
        <div
          v-if="presets.length"
          class="flex flex-wrap gap-1"
        >
          <UButton
            v-for="preset in presets"
            :key="preset.label"
            :label="preset.label"
            size="xs"
            :color="activePreset?.label === preset.label ? 'primary' : 'neutral'"
            :variant="activePreset?.label === preset.label ? 'solid' : 'subtle'"
            @click="applyPreset(preset)"
          />
        </div>

        <UCalendar
          v-if="weekMode"
          v-model="calendarSingle"
          :week-starts-on="settings.weekStartsOn"
        />
        <UCalendar
          v-else
          :model-value="calendarRange"
          range
          :number-of-months="2"
          :week-starts-on="settings.weekStartsOn"
          @update:model-value="onRangeSelect"
        />
      </div>
    </template>
  </UPopover>
</template>
