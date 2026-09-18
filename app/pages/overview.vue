<script setup lang="ts">
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format as formatDate,
} from "date-fns";
import {
  entriesInRange,
  totalHours,
  monthlyForecast,
  billingRows,
  applyDailyRoundUp,
} from "~/utils/stats";

const { activeClients, archivedClients, getById } = useClients();
const { entries, refresh } = useTimeEntries();
const { settings } = useSettings();

onMounted(() => refresh());

const allClients = computed(() => [
  ...activeClients.value,
  ...archivedClients.value,
]);

// --- stats -----------------------------------------------------------------

const filterClientId = ref<string | "all">("all");

const filterItems = computed(() => [
  { label: "All clients", value: "all" as const },
  ...allClients.value.map((c) => ({ label: c.name, value: c.id })),
]);

const now = useNow();

const weekHours = computed(() => {
  const start = startOfWeek(now.value, { weekStartsOn: settings.value.weekStartsOn });
  const end = endOfWeek(now.value, { weekStartsOn: settings.value.weekStartsOn });
  return totalHours(
    entriesInRange(entries.value, start, end, filterClientId.value),
  );
});

const monthHours = computed(() => {
  const start = startOfMonth(now.value);
  const end = endOfMonth(now.value);
  return totalHours(
    entriesInRange(entries.value, start, end, filterClientId.value),
  );
});

const forecastEntries = computed(() => {
  if (filterClientId.value === "all") return entries.value;
  return entries.value.filter((e) => e.clientId === filterClientId.value);
});
const forecast = computed(() =>
  monthlyForecast(forecastEntries.value, now.value),
);

// --- billing -----------------------------------------------------------------

const billingClientId = ref<string | undefined>(undefined);
const billingClientItems = computed(() =>
  allClients.value.map((c) => ({ label: c.name, value: c.id, color: c.color })),
);

type Preset = "this-week" | "this-month" | "last-month" | "custom";
const preset = ref<Preset>("this-month");

function toDateInput(d: Date) {
  return formatDate(d, "yyyy-MM-dd");
}
function fromDateInput(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

const billingStart = ref(toDateInput(startOfMonth(new Date())));
const billingEnd = ref(toDateInput(endOfMonth(new Date())));

function applyPreset(p: Preset) {
  preset.value = p;
  const n = new Date();
  if (p === "this-week") {
    billingStart.value = toDateInput(startOfWeek(n, { weekStartsOn: settings.value.weekStartsOn }));
    billingEnd.value = toDateInput(endOfWeek(n, { weekStartsOn: settings.value.weekStartsOn }));
  } else if (p === "this-month") {
    billingStart.value = toDateInput(startOfMonth(n));
    billingEnd.value = toDateInput(endOfMonth(n));
  } else if (p === "last-month") {
    const lastMonth = subMonths(n, 1);
    billingStart.value = toDateInput(startOfMonth(lastMonth));
    billingEnd.value = toDateInput(endOfMonth(lastMonth));
  }
}
applyPreset("this-month");

function onManualDateChange() {
  preset.value = "custom";
}

const billing = computed(() => {
  if (!billingClientId.value) return null;
  return billingRows(
    entries.value,
    billingClientId.value,
    fromDateInput(billingStart.value),
    fromDateInput(billingEnd.value),
  );
});

const displayedBilling = computed(() => {
  if (!billing.value) return null;
  const step = settings.value.billingRoundingStep;
  return step > 0 ? applyDailyRoundUp(billing.value, step) : billing.value;
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
function formatBillingDate(date: Date): string {
  return formatDate(date, settings.value.dateFormat);
}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <div
        class="flex flex-col rounded-xl flex-1 p-6 gap-6 bg-white/95 dark:bg-black/50 backdrop-blur-lg"
      >
        <div class="flex items-center justify-between flex-wrap gap-3">
          <h1 class="text-2xl font-semibold">
            Overview
          </h1>
          <USelectMenu
            v-model="filterClientId"
            :items="filterItems"
            value-key="value"
            label-key="label"
            class="w-56"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <UCard :ui="{ root: 'bg-purple-100 dark:bg-purple-950/50 ring-0' }">
            <p class="text-sm text-neutral-700 dark:text-neutral-300">
              Hours this week
            </p>
            <p
              class="text-3xl font-semibold mt-1 text-neutral-900 dark:text-white"
            >
              {{ formatHours(weekHours) }}
            </p>
          </UCard>
          <UCard :ui="{ root: 'bg-emerald-100 dark:bg-emerald-950/50 ring-0' }">
            <p class="text-sm text-neutral-700 dark:text-neutral-300">
              Hours this month
            </p>
            <p
              class="text-3xl font-semibold mt-1 text-neutral-900 dark:text-white"
            >
              {{ formatHours(monthHours) }}
            </p>
          </UCard>
          <UCard :ui="{ root: 'bg-amber-100 dark:bg-amber-950/50 ring-0' }">
            <p class="text-sm text-neutral-700 dark:text-neutral-300">
              Revenue forecast (this month)
            </p>
            <p
              class="text-3xl font-semibold mt-1 text-neutral-900 dark:text-white"
            >
              {{ formatCurrency(forecast.forecast, settings.currency) }}
            </p>
            <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
              {{ formatCurrency(forecast.revenueSoFar, settings.currency) }} so far ·
              {{ forecast.elapsedWorkdays }}/{{ forecast.totalWorkdays }}
              workdays elapsed
            </p>
          </UCard>
        </div>

        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold">
              Billing
            </h2>
          </div>

          <UCard>
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-end gap-3">
                <UFormField
                  label="Client"
                  required
                >
                  <USelectMenu
                    v-model="billingClientId"
                    :items="billingClientItems"
                    value-key="value"
                    label-key="label"
                    searchable
                    placeholder="Select a client"
                    class="w-56"
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
                    </template>
                    <template #item-leading="{ item }">
                      <span
                        class="size-2.5 rounded-full shrink-0"
                        :style="{ backgroundColor: item.color }"
                      />
                    </template>
                  </USelectMenu>
                </UFormField>

                <UFormField label="From">
                  <UInput
                    v-model="billingStart"
                    type="date"
                    @change="onManualDateChange"
                  />
                </UFormField>
                <UFormField label="To">
                  <UInput
                    v-model="billingEnd"
                    type="date"
                    @change="onManualDateChange"
                  />
                </UFormField>

                <div class="flex gap-1 ml-auto">
                  <UButton
                    label="This week"
                    size="xs"
                    :color="preset === 'this-week' ? 'primary' : 'neutral'"
                    :variant="preset === 'this-week' ? 'solid' : 'subtle'"
                    @click="applyPreset('this-week')"
                  />
                  <UButton
                    label="This month"
                    size="xs"
                    :color="preset === 'this-month' ? 'primary' : 'neutral'"
                    :variant="preset === 'this-month' ? 'solid' : 'subtle'"
                    @click="applyPreset('this-month')"
                  />
                  <UButton
                    label="Last month"
                    size="xs"
                    :color="preset === 'last-month' ? 'primary' : 'neutral'"
                    :variant="preset === 'last-month' ? 'solid' : 'subtle'"
                    @click="applyPreset('last-month')"
                  />
                </div>
              </div>

              <p
                v-if="settings.billingRoundingStep > 0"
                class="text-xs text-muted"
              >
                Daily hours are rounded up to {{ settings.billingRoundingStep * 60 }}-minute
                steps —
                <NuxtLink
                  to="/settings"
                  class="underline"
                >
                  change in Settings
                </NuxtLink>.
              </p>

              <div
                v-if="!billingClientId"
                class="py-10"
              >
                <UEmpty
                  icon="i-lucide-receipt"
                  size="sm"
                  title="Select a client"
                  description="Choose a client and a date range to calculate billable hours and revenue."
                />
              </div>

              <div
                v-else-if="
                  !displayedBilling || displayedBilling.rows.length === 0
                "
                class="py-10"
              >
                <UEmpty
                  icon="i-lucide-calendar-x"
                  size="sm"
                  title="No time entries"
                  description="There are no time entries for this client in the selected date range."
                />
              </div>

              <table
                v-else
                class="w-full text-sm"
              >
                <thead>
                  <tr class="text-left text-muted border-b border-default">
                    <th class="py-2 font-medium">
                      Day
                    </th>
                    <th class="py-2 font-medium">
                      Date
                    </th>
                    <th class="py-2 font-medium text-right">
                      Hours
                    </th>
                    <th class="py-2 font-medium text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in displayedBilling.rows"
                    :key="row.date.toISOString()"
                    class="border-b border-default/60"
                  >
                    <td class="py-2">
                      {{ weekdayFormatter.format(row.date) }}
                    </td>
                    <td class="py-2">
                      {{ formatBillingDate(row.date) }}
                    </td>
                    <td class="py-2 text-right tabular-nums">
                      {{ formatHours(row.hours) }}
                    </td>
                    <td class="py-2 text-right tabular-nums">
                      {{ formatCurrency(row.amount, settings.currency) }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-semibold">
                    <td
                      class="py-2"
                      colspan="2"
                    >
                      Total
                    </td>
                    <td class="py-2 text-right tabular-nums">
                      {{ formatHours(displayedBilling.totalHours) }}
                    </td>
                    <td class="py-2 text-right tabular-nums">
                      {{ formatCurrency(displayedBilling.totalAmount, settings.currency) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
