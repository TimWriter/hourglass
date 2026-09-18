<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'

const { refresh: refreshClients } = useClients()
const { refresh: refreshEntries, checkAutoStop } = useTimeEntries()

onMounted(() => {
  refreshClients()
  refreshEntries()
})

const { pause, resume } = useIntervalFn(() => checkAutoStop(), 30_000)
onUnmounted(() => pause())
resume()
</script>

<template>
  <UDashboardPanel :ui="{ root: 'overflow-hidden' }">
    <WeekCalendar class="h-full" />
  </UDashboardPanel>
</template>
