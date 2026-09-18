<script setup lang="ts">
import { format } from "date-fns";
import type { DefaultPage, TimeFormat, WeekStartsOn } from "~/types";

const { settings, update } = useSettings();
const { fileName, status, createNew, openExisting, flushNow } = useDatabase();

const CURRENCIES: { code: string; name: string }[] = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "DKK", name: "Danish Krone" },
  { code: "PLN", name: "Polish Złoty" },
  { code: "CZK", name: "Czech Koruna" },
];
const currencyItems = computed(() =>
  CURRENCIES.map((c) => ({
    label: `${c.name} (${currencySymbol(c.code)})`,
    value: c.code,
  })),
);

const DATE_FORMATS = ["dd.MM.yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "d MMM yyyy"];
const dateFormatItems = computed(() =>
  DATE_FORMATS.map((f) => ({ label: format(new Date(), f), value: f })),
);

const ROUNDING_STEPS = [
  { label: "Off (exact hours)", value: 0 },
  { label: "15 minutes", value: 0.25 },
  { label: "30 minutes", value: 0.5 },
  { label: "1 hour", value: 1 },
];

const SNAP_OPTIONS = [
  { label: "5 minutes", value: 5 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
];

const DEFAULT_PAGE_OPTIONS: { label: string; value: DefaultPage }[] = [
  { label: "Track", value: "track" },
  { label: "Clients", value: "clients" },
  { label: "Overview", value: "overview" },
];

const AUTO_STOP_OPTIONS = [
  { label: "Never", value: 0 },
  { label: "4 hours", value: 4 },
  { label: "8 hours", value: 8 },
  { label: "12 hours", value: 12 },
  { label: "24 hours", value: 24 },
  { label: "48 hours", value: 48 },
];

function setTimeFormat(value: TimeFormat) {
  update({ timeFormat: value });
}
function setWeekStartsOn(value: WeekStartsOn) {
  update({ weekStartsOn: value });
}

const currency = computed({
  get: () => settings.value.currency,
  set: (value: string) => update({ currency: value }),
});
const dateFormat = computed({
  get: () => settings.value.dateFormat,
  set: (value: string) => update({ dateFormat: value }),
});
const billingRoundingStep = computed({
  get: () => settings.value.billingRoundingStep,
  set: (value: number) => update({ billingRoundingStep: value }),
});
const snapMinutes = computed({
  get: () => settings.value.snapMinutes,
  set: (value: number) => update({ snapMinutes: value }),
});
const defaultPage = computed({
  get: () => settings.value.defaultPage,
  set: (value: DefaultPage) => update({ defaultPage: value }),
});
const autoStopHours = computed({
  get: () => settings.value.autoStopHours,
  set: (value: number) => update({ autoStopHours: value }),
});

const clockPreview = computed(() =>
  formatClock(new Date(), settings.value.timeFormat),
);

// Flush any pending debounced write against the CURRENT file before
// swapping db.value/fileHandle.value out from under it — otherwise a
// change made in the last ~400ms could be lost instead of saved.
async function switchToNewFile() {
  flushNow();
  await createNew();
}
async function switchToExistingFile() {
  flushNow();
  await openExisting();
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <div
        class="flex flex-col rounded-xl flex-1 p-6 gap-6 bg-white/95 dark:bg-black/50 backdrop-blur-lg"
      >
        <div>
          <h1 class="text-2xl font-semibold">
            Settings
          </h1>
          <p class="text-sm text-muted mt-1">
            Stored in your database file, so they follow it wherever it goes.
          </p>
        </div>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              Formatting
            </h2>
          </template>

          <div class="flex flex-col gap-4">
            <UFormField
              label="Time format"
              :description="`Preview: ${clockPreview}`"
            >
              <UButtonGroup>
                <UButton
                  label="24-hour"
                  size="sm"
                  :color="settings.timeFormat === '24h' ? 'primary' : 'neutral'"
                  :variant="settings.timeFormat === '24h' ? 'solid' : 'subtle'"
                  @click="setTimeFormat('24h')"
                />
                <UButton
                  label="12-hour"
                  size="sm"
                  :color="settings.timeFormat === '12h' ? 'primary' : 'neutral'"
                  :variant="settings.timeFormat === '12h' ? 'solid' : 'subtle'"
                  @click="setTimeFormat('12h')"
                />
              </UButtonGroup>
            </UFormField>

            <UFormField label="First day of the week">
              <UButtonGroup>
                <UButton
                  label="Monday"
                  size="sm"
                  :color="settings.weekStartsOn === 1 ? 'primary' : 'neutral'"
                  :variant="settings.weekStartsOn === 1 ? 'solid' : 'subtle'"
                  @click="setWeekStartsOn(1)"
                />
                <UButton
                  label="Sunday"
                  size="sm"
                  :color="settings.weekStartsOn === 0 ? 'primary' : 'neutral'"
                  :variant="settings.weekStartsOn === 0 ? 'solid' : 'subtle'"
                  @click="setWeekStartsOn(0)"
                />
              </UButtonGroup>
            </UFormField>

            <UFormField label="Currency">
              <USelectMenu
                v-model="currency"
                :items="currencyItems"
                value-key="value"
                label-key="label"
                searchable
                class="w-64"
              />
            </UFormField>

            <UFormField label="Date format">
              <USelectMenu
                v-model="dateFormat"
                :items="dateFormatItems"
                value-key="value"
                label-key="label"
                class="w-64"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              Track & Calendar
            </h2>
          </template>

          <div class="flex flex-col gap-4">
            <UFormField
              label="Calendar snapping"
              description="Drag-to-create, move, and resize snap to this granularity."
            >
              <USelectMenu
                v-model="snapMinutes"
                :items="SNAP_OPTIONS"
                value-key="value"
                label-key="label"
                class="w-48"
              />
            </UFormField>

            <UFormField
              label="Default page on launch"
              description="Which page opens once your database file connects."
            >
              <USelectMenu
                v-model="defaultPage"
                :items="DEFAULT_PAGE_OPTIONS"
                value-key="value"
                label-key="label"
                class="w-48"
              />
            </UFormField>

            <UFormField
              label="Auto-stop running timers after"
              description="A timer left running this long is stopped automatically and flagged for review."
            >
              <USelectMenu
                v-model="autoStopHours"
                :items="AUTO_STOP_OPTIONS"
                value-key="value"
                label-key="label"
                class="w-48"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              Database file
            </h2>
          </template>

          <div class="flex flex-col gap-4">
            <UFormField
              label="Current file"
              :description="status === 'connected' ? undefined : 'Not connected.'"
            >
              <p class="text-sm font-medium text-highlighted">
                {{ fileName || "—" }}
              </p>
            </UFormField>

            <div class="flex flex-wrap gap-2">
              <UButton
                label="Switch to a different file"
                icon="i-lucide-folder-open"
                color="neutral"
                variant="subtle"
                @click="switchToExistingFile"
              />
              <UButton
                label="Create a new file"
                icon="i-lucide-file-plus"
                color="neutral"
                variant="subtle"
                @click="switchToNewFile"
              />
            </div>
            <p class="text-xs text-muted">
              Switching writes any unsaved changes to the current file first,
              then connects the one you pick — your settings live in the
              database file itself, so they won't carry over to a different
              file.
            </p>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              Billing
            </h2>
          </template>

          <UFormField
            label="Round up daily hours"
            description="Applied to the billing table on the Overview page."
          >
            <USelectMenu
              v-model="billingRoundingStep"
              :items="ROUNDING_STEPS"
              value-key="value"
              label-key="label"
              class="w-48"
            />
          </UFormField>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
