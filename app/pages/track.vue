<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";

const { refresh: refreshClients } = useClients();
const { refresh: refreshEntries, checkAutoStop } = useTimeEntries();
const { settings } = useSettings();

onMounted(() => {
  refreshClients();
  refreshEntries();
});

const { pause, resume } = useIntervalFn(() => checkAutoStop(settings.value.autoStopHours), 30_000);
onUnmounted(() => pause());
resume();
</script>

<template>
  <UDashboardPanel :ui="{ root: 'overflow-hidden' }">
    <WeekCalendar class="h-full" />
  </UDashboardPanel>
</template>
