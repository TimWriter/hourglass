<script setup lang="ts">
import type { Client } from "~/types";

const props = defineProps<{
  client?: Client | null;
}>();

const open = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{
  saved: [];
}>();

const PALETTE: string[] = [
  "#4F46E5", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#8B5CF6", "#14B8A6",
  "#F97316", "#64748B",
];
const DEFAULT_COLOR: string = PALETTE[0] ?? "#4F46E5";

function randomPaletteColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)] ?? DEFAULT_COLOR;
}

const { create, update } = useClients();

const name = ref("");
const hourlyRate = ref<number>(0);
const color = ref<string>(DEFAULT_COLOR);

const isEdit = computed(() => !!props.client);

watch(open, (value) => {
  if (!value) return;
  name.value = props.client?.name ?? "";
  hourlyRate.value = props.client?.hourlyRate ?? 0;
  color.value = props.client?.color ?? randomPaletteColor();
}, { immediate: true });

const canSave = computed(() => name.value.trim().length > 0 && hourlyRate.value >= 0);

function save() {
  if (!canSave.value) return;
  const data = { name: name.value.trim(), hourlyRate: hourlyRate.value, color: color.value };
  if (props.client) {
    update(props.client.id, data);
  } else {
    create(data);
  }
  emit("saved");
  open.value = false;
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? 'Edit client' : 'New client'"
    :description="isEdit ? 'Update the client details.' : 'Add a new client to track time and revenue for.'"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField
          label="Name"
          required
        >
          <UInput
            v-model="name"
            placeholder="Acme Inc."
            class="w-full"
            autofocus
            @keydown.enter="save"
          />
        </UFormField>

        <UFormField
          label="Hourly rate"
          required
        >
          <div class="flex items-center gap-2">
            <UInputNumber
              v-model="hourlyRate"
              :min="0"
              :step="5"
              class="flex-1"
            />
            <span class="text-sm text-muted">€ / h</span>
          </div>
        </UFormField>

        <UFormField label="Color">
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="swatch in PALETTE"
                :key="swatch"
                type="button"
                class="size-7 rounded-full ring-2 ring-offset-2 ring-offset-default transition"
                :class="color === swatch ? 'ring-primary' : 'ring-transparent'"
                :style="{ backgroundColor: swatch }"
                :aria-label="`Use color ${swatch}`"
                @click="color = swatch"
              />
              <UPopover>
                <button
                  type="button"
                  class="size-7 rounded-full ring-2 ring-offset-2 ring-offset-default flex items-center justify-center border border-default"
                  :class="PALETTE.includes(color) ? 'ring-transparent' : 'ring-primary'"
                  :style="{ backgroundColor: color }"
                  aria-label="Custom color"
                >
                  <UIcon
                    v-if="PALETTE.includes(color)"
                    name="i-lucide-pipette"
                    class="size-3 text-white/90"
                  />
                </button>
                <template #content>
                  <UColorPicker
                    v-model="color"
                    class="p-3"
                  />
                </template>
              </UPopover>
            </div>
            <p class="text-xs text-muted">
              {{ color }}
            </p>
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="close"
        />
        <UButton
          :label="isEdit ? 'Save changes' : 'Create client'"
          :disabled="!canSave"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
