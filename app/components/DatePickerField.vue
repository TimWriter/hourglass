<script setup lang="ts">
import { CalendarDate, type DateValue } from "@internationalized/date";

// v-model is a plain 'yyyy-MM-dd' string (matches the rest of the app's
// date handling), converted to/from a CalendarDate for UCalendar.
const modelValue = defineModel<string>({ required: true });

function toCalendarDate(value: string): CalendarDate {
  const [y, m, d] = value.split("-").map(Number);
  return new CalendarDate(y ?? new Date().getFullYear(), m ?? 1, d ?? 1);
}

function toDateString(value: DateValue): string {
  return `${value.year.toString().padStart(4, "0")}-${value.month.toString().padStart(2, "0")}-${value.day.toString().padStart(2, "0")}`;
}

const calendarValue = computed<DateValue>({
  get: () => toCalendarDate(modelValue.value),
  set: (value) => {
    if (value) modelValue.value = toDateString(value);
  },
});

const dateFormatter = new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "2-digit", year: "numeric" });
const displayLabel = computed(() => dateFormatter.format(toCalendarDate(modelValue.value).toDate("UTC")));

const open = ref(false);
</script>

<template>
  <UPopover v-model:open="open">
    <UButton
      :label="displayLabel"
      icon="i-lucide-calendar"
      color="neutral"
      variant="outline"
      class="w-full justify-start font-normal"
    />

    <template #content>
      <UCalendar
        v-model="calendarValue"
        class="p-2"
        @update:model-value="open = false"
      />
    </template>
  </UPopover>
</template>
