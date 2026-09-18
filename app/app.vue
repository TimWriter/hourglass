<script setup lang="ts">
// Bound (not a static attribute) so Vue's SFC compiler doesn't wrap it in
// Nuxt's publicAssetsURL()/baseURL-joining helper — scripts/pack-offline.mjs
// substitutes this constant for a data: URI, and that wrapper would corrupt
// the result into "/data:image/png;base64,..." at runtime.
const logoSrc = "/logo.png";

useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [{ rel: "icon", href: logoSrc }],
  htmlAttrs: {
    lang: "en",
  },
});

useSeoMeta({
  title: "Hourglass",
  description: "A local, single-file time tracker for solo freelancers.",
});

const { ready, init } = useDatabase();
const { refresh: refreshClients } = useClients();
const { refresh: refreshEntries } = useTimeEntries();

onMounted(async () => {
  await init();
});

watch(
  ready,
  (isReady) => {
    if (isReady) {
      refreshClients();
      refreshEntries();
    }
  },
  { immediate: true },
);

const navItems = [
  { label: "Track", to: "/track", icon: "i-lucide-timer" },
  { label: "Clients", to: "/clients", icon: "i-lucide-users" },
  { label: "Overview", to: "/overview", icon: "i-lucide-bar-chart-3" },
];

const route = useRoute();
</script>

<template>
  <UApp>
    <template v-if="!ready">
      <SetupScreen />
    </template>

    <template v-else>
      <UDashboardGroup
        unit="px"
        class="bg-zinc-900"
      >
        <UDashboardSidebar
          :default-size="260"
          :resizable="false"
          :collapsible="false"
          :ui="{
            root: 'border-none py-6 pl-2 gap-2 bg-zinc-900',
            header: 'p-0 bg-zinc-900',
            body: 'p-0 bg-zinc-900',
            footer: 'border-t border-white/10 bg-zinc-900',
          }"
        >
          <template #header>
            <NuxtLink
              to="/track"
              class="flex items-center font-semibold text-white rounded-lg px-2 py-3 backdrop-blur-lg bg-black/25 w-full"
            >
              <span class="flex items-center justify-center size-8">
                <img
                  class="size-5"
                  :src="logoSrc"
                  alt="Hourglass logo"
                >
              </span>
              Hourglass
            </NuxtLink>
          </template>

          <nav
            class="flex flex-col gap-1 p-2 backdrop-blur-lg bg-black/25 rounded-lg"
          >
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              :class="
                route.path === item.to
                  ? 'bg-white text-neutral-900'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              "
            >
              <UIcon
                :name="item.icon"
                class="size-4 shrink-0"
              />
              {{ item.label }}
            </NuxtLink>
          </nav>

          <template #footer="{ collapsed }">
            <div
              class="flex items-center gap-2"
              :class="collapsed ? 'flex-col' : 'justify-between w-full'"
            >
              <ConnectionStatusBadge />
              <UColorModeButton
                class="text-white/80 hover:text-white hover:bg-white/10"
              />
            </div>
          </template>
        </UDashboardSidebar>

        <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div
            class="lg:hidden flex items-center gap-3 border-b border-white/10 px-3 py-2.5 shrink-0"
            style="background-color: #1e1e1e"
          >
            <UDashboardSidebarToggle />
            <span class="font-semibold text-white">Hourglass</span>
          </div>

          <NuxtPage />
        </div>
      </UDashboardGroup>
    </template>
  </UApp>
</template>
