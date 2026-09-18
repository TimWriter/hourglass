<script setup lang="ts">
import type { TimeEntry } from "~/types";

const props = defineProps<{
  entry: TimeEntry | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const { activeClients, getById } = useClients();
const { update, remove, stop } = useTimeEntries();

const title = ref("");
const clientId = ref<string | null>(null);
const startDate = ref("");
const startTime = ref("");
const endDate = ref("");
const endTime = ref("");
const isRunning = ref(false);

const clientItems = computed(() => [
  { label: "No client", value: null, color: null as string | null },
  ...activeClients.value.map((c) => ({
    label: c.name,
    value: c.id,
    color: c.color,
  })),
]);

function toDateInput(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function combine(dateStr: string, timeStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  const d = new Date(
    y ?? new Date().getFullYear(),
    (m ?? 1) - 1,
    day ?? 1,
    h ?? 0,
    min ?? 0,
    0,
    0,
  );
  return d.toISOString();
}

watch(
  open,
  (value) => {
    if (!value || !props.entry) return;
    const entry = props.entry;
    title.value = entry.title;
    clientId.value = entry.clientId;
    const start = new Date(entry.start);
    startDate.value = toDateInput(start);
    startTime.value = toTimeInput(start);
    isRunning.value = entry.end === null;
    const end = entry.end ? new Date(entry.end) : new Date();
    endDate.value = toDateInput(end);
    endTime.value = toTimeInput(end);
  },
  { immediate: true },
);

const startIso = computed(() => combine(startDate.value, startTime.value));
const endIso = computed(() => combine(endDate.value, endTime.value));

const isValid = computed(() => {
  if (isRunning.value) return true;
  return new Date(endIso.value).getTime() > new Date(startIso.value).getTime();
});

function save() {
  if (!props.entry || !isValid.value) return;
  update(props.entry.id, {
    title: title.value,
    clientId: clientId.value,
    start: startIso.value,
    end: isRunning.value ? null : endIso.value,
  });
  open.value = false;
}

function stopNow() {
  if (!props.entry) return;
  isRunning.value = false;
  stop(props.entry.id);
  open.value = false;
}

function onDelete() {
  if (!props.entry) return;
  remove(props.entry.id);
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Edit time entry"
    :description="
      entry?.autoStopped24h
        ? 'This entry was automatically stopped after running for 24 hours.'
        : undefined
    "
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UAlert
          v-if="entry?.autoStopped24h"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Auto-stopped after 24h"
          description="Please check and correct the start and end time."
        />

        <UFormField label="Title">
          <UInput
            v-model="title"
            placeholder="What did you work on?"
            class="w-full"
            autofocus
          />
        </UFormField>

        <UFormField label="Client">
          <USelectMenu
            v-model="clientId"
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

        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Start date">
            <DatePickerField v-model="startDate" />
          </UFormField>
          <UFormField label="Start time">
            <UInput
              v-model="startTime"
              type="time"
              class="w-full"
            />
          </UFormField>
        </div>

        <div
          v-if="!isRunning"
          class="grid grid-cols-2 gap-3"
        >
          <UFormField label="End date">
            <DatePickerField v-model="endDate" />
          </UFormField>
          <UFormField label="End time">
            <UInput
              v-model="endTime"
              type="time"
              class="w-full"
            />
          </UFormField>
        </div>
        <UAlert
          v-else
          color="primary"
          variant="subtle"
          icon="i-lucide-play"
          title="Still running"
          description="Stop the timer to set a fixed end time."
        >
          <template #actions>
            <UButton
              label="Stop now"
              size="xs"
              color="primary"
              @click="stopNow"
            />
          </template>
        </UAlert>

        <p
          v-if="!isValid"
          class="text-sm text-error"
        >
          End time must be after the start time.
        </p>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-between items-center w-full">
        <UButton
          label="Delete"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          @click="onDelete"
        />
        <div class="flex gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="close"
          />
          <UButton
            label="Save changes"
            :disabled="!isValid"
            @click="save"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
