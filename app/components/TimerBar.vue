<script setup lang="ts">
const { activeClients, getById } = useClients()
const { runningEntry, start, stop } = useTimeEntries()
const now = useNow()

const title = ref('')
const selectedClientId = ref<string | null>(null)

const clientItems = computed(() => [
  { label: 'No client', value: null, color: null as string | null },
  ...activeClients.value.map(c => ({
    label: c.name,
    value: c.id,
    color: c.color
  }))
])

const isRunning = computed(() => !!runningEntry.value)

watch(
  runningEntry,
  (entry) => {
    if (entry) {
      title.value = entry.title
      selectedClientId.value = entry.clientId
    }
  },
  { immediate: true }
)

const elapsedMs = computed(() => {
  if (!runningEntry.value) return 0
  return Math.max(
    0,
    now.value.getTime() - new Date(runningEntry.value.start).getTime()
  )
})

const elapsedLabel = computed(() => formatDuration(elapsedMs.value))

function toggle() {
  if (runningEntry.value) {
    stop(runningEntry.value.id)
  } else {
    start(title.value.trim(), selectedClientId.value)
  }
}

function onTitleChange() {
  if (runningEntry.value) {
    useTimeEntries().update(runningEntry.value.id, { title: title.value })
  }
}

function onClientChange() {
  if (runningEntry.value) {
    useTimeEntries().update(runningEntry.value.id, {
      clientId: selectedClientId.value
    })
  }
}

useHead({
  title: computed(() => {
    if (!isRunning.value) return 'Hourglass'
    const client = getById(selectedClientId.value)
    const label = title.value.trim() || 'Untitled'
    return `${elapsedLabel.value} · ${client ? client.name : label}`
  })
})
</script>

<template>
  <div class="border-b border-default p-3">
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <UInput
        v-model="title"
        placeholder="What are you working on?"
        class="flex-1 min-w-0"
        size="lg"
        variant="soft"
        @change="onTitleChange"
        @keydown.enter="!isRunning && toggle()"
      />

      <USelectMenu
        v-model="selectedClientId"
        :items="clientItems"
        value-key="value"
        label-key="label"
        searchable
        placeholder="No client"
        class="w-full sm:w-40 shrink-0"
        size="lg"
        :ui="{ item: 'items-center' }"
        @update:model-value="onClientChange"
      >
        <template #leading="{ modelValue }">
          <span
            v-if="getById(modelValue as string)"
            class="size-2.5 rounded-full shrink-0"
            :style="{ backgroundColor: getById(modelValue as string)?.color }"
          />
          <span
            v-else
            class="size-2.5 rounded-full shrink-0 border border-dashed border-default"
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
            class="size-2.5 rounded-full shrink-0 border border-dashed border-default"
          />
        </template>
      </USelectMenu>

      <div
        class="flex items-center gap-3 justify-between sm:justify-start shrink-0"
      >
        <span
          class="font-mono text-base tabular-nums text-center rounded-full px-3 py-1.5"
          :class="
            isRunning
              ? 'bg-neutral-50 text-primary dark:bg-white dark:text-neutral-900'
              : 'bg-neutral-50 dark:bg-neutral-800 text-muted'
          "
        >{{ elapsedLabel }}</span>
        <UButton
          :label="isRunning ? 'Stop' : 'Start'"
          :icon="isRunning ? 'i-lucide-square' : 'i-lucide-play'"
          :color="isRunning ? 'error' : 'primary'"
          size="lg"
          class="justify-center"
          :ui="{ leadingIcon: 'size-4' }"
          @click="toggle"
        />
      </div>
    </div>
  </div>
</template>
