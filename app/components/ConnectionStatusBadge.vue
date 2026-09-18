<script setup lang="ts">
const { saveState, fileName } = useDatabase();

const label = computed(() => {
  if (saveState.value === "saving") return "Saving…";
  if (saveState.value === "error") return "Save failed";
  return "Saved";
});

const icon = computed(() => {
  if (saveState.value === "saving") return "i-lucide-loader-circle";
  if (saveState.value === "error") return "i-lucide-triangle-alert";
  return "i-lucide-check";
});

const color = computed(() => {
  if (saveState.value === "error") return "error";
  if (saveState.value === "saving") return "neutral";
  return "success";
});
</script>

<template>
  <UTooltip :text="fileName || 'Not connected'">
    <UBadge
      :color="color"
      variant="subtle"
      size="sm"
      class="gap-1"
    >
      <UIcon
        :name="icon"
        class="size-3"
        :class="saveState === 'saving' && 'animate-spin'"
      />
      {{ label }}
    </UBadge>
  </UTooltip>
</template>
