<script setup lang="ts">
const { pending, keep, discardAndContinue } = useIdleDetection();

const open = computed({
  get: () => !!pending.value,
  set: (value: boolean) => {
    if (!value) keep();
  },
});

const gapLabel = computed(() => pending.value ? formatDuration(pending.value.gapMs) : "");
</script>

<template>
  <UModal
    v-model:open="open"
    title="Welcome back"
    :description="`This tab was in the background for ${gapLabel} while a timer was running.`"
  >
    <template #body>
      <p class="text-sm text-muted">
        Keep the whole stretch as billable time, or discard the gap and
        continue tracking from now?
      </p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="Keep it"
          color="neutral"
          variant="subtle"
          @click="keep"
        />
        <UButton
          label="Discard gap & continue"
          @click="discardAndContinue"
        />
      </div>
    </template>
  </UModal>
</template>
