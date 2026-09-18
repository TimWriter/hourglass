<script setup lang="ts">
import type { Client } from "~/types";

const {
  activeClients,
  archivedClients,
  refresh,
  setArchived,
  remove,
  hasTimeEntries,
} = useClients();
const { settings } = useSettings();

onMounted(() => refresh());

const modalOpen = ref(false);
const editingClient = ref<Client | null>(null);
const archivedOpen = ref(false);

function openCreate() {
  editingClient.value = null;
  modalOpen.value = true;
}

function openEdit(client: Client) {
  editingClient.value = client;
  modalOpen.value = true;
}

const deletableIds = computed(() => {
  const set = new Set<string>();
  for (const client of [...activeClients.value, ...archivedClients.value]) {
    if (!hasTimeEntries(client.id)) set.add(client.id);
  }
  return set;
});

function onDelete(client: Client) {
  remove(client.id);
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <div
        class="flex flex-col rounded-xl flex-1 p-6 bg-white/95 dark:bg-black/50 backdrop-blur-lg"
      >
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-semibold">
              Clients
            </h1>
            <p class="text-sm text-muted mt-1">
              Manage the clients you track time and revenue for.
            </p>
          </div>
          <UButton
            label="New client"
            icon="i-lucide-plus"
            @click="openCreate"
          />
        </div>

        <div
          v-if="activeClients.length === 0"
          class="py-16"
        >
          <UEmpty
            icon="i-lucide-users"
            size="sm"
            title="No clients yet"
            description="Add your first client to start tracking billable time against an hourly rate."
          >
            <template #actions>
              <UButton
                label="New client"
                icon="i-lucide-plus"
                @click="openCreate"
              />
            </template>
          </UEmpty>
        </div>

        <div
          v-else
          class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <UCard
            v-for="client in activeClients"
            :key="client.id"
            :ui="{ body: 'flex flex-col gap-3' }"
          >
            <div class="flex items-center gap-3">
              <span
                class="size-4 rounded-full shrink-0"
                :style="{ backgroundColor: client.color }"
              />
              <div class="min-w-0">
                <p class="font-medium truncate">
                  {{ client.name }}
                </p>
                <p class="text-sm text-muted">
                  {{ formatCurrency(client.hourlyRate, settings.currency) }} / h
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="subtle"
                label="Edit"
                @click="openEdit(client)"
              />
              <UButton
                icon="i-lucide-archive"
                size="xs"
                color="neutral"
                variant="ghost"
                label="Archive"
                @click="setArchived(client.id, true)"
              />
              <UTooltip
                :text="
                  deletableIds.has(client.id)
                    ? 'Delete client'
                    : 'Cannot delete: this client has time entries'
                "
              >
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  color="error"
                  variant="ghost"
                  :disabled="!deletableIds.has(client.id)"
                  @click="onDelete(client)"
                />
              </UTooltip>
            </div>
          </UCard>
        </div>

        <div
          v-if="archivedClients.length > 0"
          class="mt-8"
        >
          <UButton
            :icon="
              archivedOpen ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'
            "
            color="neutral"
            variant="ghost"
            size="sm"
            :label="`Archived clients (${archivedClients.length})`"
            @click="archivedOpen = !archivedOpen"
          />

          <div
            v-if="archivedOpen"
            class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-3"
          >
            <UCard
              v-for="client in archivedClients"
              :key="client.id"
              :ui="{ body: 'flex flex-col gap-3' }"
              class="opacity-70"
            >
              <div class="flex items-center gap-3">
                <span
                  class="size-4 rounded-full shrink-0"
                  :style="{ backgroundColor: client.color }"
                />
                <div class="min-w-0">
                  <p class="font-medium truncate">
                    {{ client.name }}
                  </p>
                  <p class="text-sm text-muted">
                    {{ formatCurrency(client.hourlyRate, settings.currency) }} / h
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <UButton
                  icon="i-lucide-archive-restore"
                  size="xs"
                  color="neutral"
                  variant="subtle"
                  label="Unarchive"
                  @click="setArchived(client.id, false)"
                />
                <UTooltip
                  :text="
                    deletableIds.has(client.id)
                      ? 'Delete client'
                      : 'Cannot delete: this client has time entries'
                  "
                >
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="ghost"
                    :disabled="!deletableIds.has(client.id)"
                    @click="onDelete(client)"
                  />
                </UTooltip>
              </div>
            </UCard>
          </div>
        </div>

        <ClientFormModal
          v-model:open="modalOpen"
          :client="editingClient"
        />
      </div>
    </template>
  </UDashboardPanel>
</template>
