<script setup lang="ts">
const { settings } = useSettings();
await navigateTo(`/${settings.value.defaultPage}`, { replace: true });
</script>

<template>
  <div />
</template>
