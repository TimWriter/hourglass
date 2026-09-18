<script setup lang="ts">
import type { DateValue } from "@internationalized/date";
import { format } from "date-fns";
import { toCalendarDate, calendarDateToInput, fromDateInput } from "~/utils/date";

const { settings } = useSettings();

// v-model is a plain 'yyyy-MM-dd' string (matches the rest of the app's
// date handling), converted to/from a CalendarDate for UCalendar.
const modelValue = defineModel<string>({ required: true });

const calendarValue = computed<DateValue>({
  get: () => toCalendarDate(modelValue.value),
  set: (value) => {
    if (value) modelValue.value = calendarDateToInput(value);
  },
});

// fromDateInput (not calendarValue.toDate(), which interprets the calendar
// day in a fixed zone and can shift a day under date-fns' local getters)
// keeps this consistent with the rest of the app's local-time convention.
const displayLabel = computed(() => format(fromDateInput(modelValue.value), settings.value.dateFormat));

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
