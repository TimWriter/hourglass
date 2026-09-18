<script setup lang="ts">
const { status, errorMessage, fileName, createNew, openExisting, reconnect } =
  useDatabase();
</script>

<template>
  <div class="min-h-[calc(100vh-1px)] flex items-center justify-center px-4">
    <UCard
      class="w-full max-w-md"
      :ui="{ body: 'flex flex-col items-center text-center gap-4 py-8' }"
    >
      <template v-if="status === 'unsupported'">
        <UIcon name="i-lucide-ban" class="size-9 text-error" />
        <div>
          <h1 class="text-lg font-semibold">Browser not supported</h1>
          <p class="text-sm text-muted mt-1">
            This app stores its data in a local SQLite file using the File
            System Access API, which is only available in Chromium-based
            browsers (Chrome, Edge). Please open this app in Chrome or Edge to
            continue.
          </p>
        </div>
      </template>

      <template v-else-if="status === 'needs-reconnect'">
        <UIcon name="i-lucide-unplug" class="size-9 text-warning" />
        <div>
          <h1 class="text-lg font-semibold">Reconnect database</h1>
          <p class="text-sm text-muted mt-1">
            Your browser needs permission to access
            <span class="font-medium text-highlighted">{{ fileName }}</span>
            again.
          </p>
        </div>
        <UButton
          label="Reconnect database"
          icon="i-lucide-unplug"
          size="lg"
          @click="reconnect"
        />
      </template>

      <template v-else-if="status === 'checking' || status === 'connecting'">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-9 animate-spin text-primary"
        />
        <p class="text-sm text-muted">Loading database…</p>
      </template>

      <template v-else>
        <UIcon name="i-lucide-database" class="size-9 text-primary" />
        <div>
          <h1 class="text-lg font-semibold">Connect your database file</h1>
          <p class="text-sm text-muted mt-1">
            Hourglass stores everything locally in a single SQLite file that
            lives on your computer. Create a new one to get started, or connect
            an existing file.
          </p>
        </div>

        <UAlert
          v-if="status === 'error'"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Something went wrong"
          :description="errorMessage"
          class="w-full text-left"
        />

        <div class="flex flex-col sm:flex-row gap-2 w-full">
          <UButton
            label="Create new database file"
            icon="i-lucide-file-plus"
            size="lg"
            class="flex-1 justify-center"
            @click="createNew"
          />
          <UButton
            label="Open existing file"
            icon="i-lucide-folder-open"
            size="lg"
            color="neutral"
            variant="subtle"
            class="flex-1 justify-center"
            @click="openExisting"
          />
        </div>
      </template>
    </UCard>
  </div>
</template>
