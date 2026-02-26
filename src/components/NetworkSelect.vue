<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useApp } from "../composables/useApp";

const COLLAPSE_THRESHOLD = 140;

const props = defineProps<{
  sidebarWidth: number;
}>();

defineEmits<{
  (e: "network-selected"): void;
}>();

const { app } = useApp();
const search = ref("");

const isCollapsed = computed(() => props.sidebarWidth < COLLAPSE_THRESHOLD);

const filteredNetworks = computed(() => {
  const networks = Object.values(app.value.networks);
  if (!search.value.trim()) return networks;
  const q = search.value.toLowerCase().trim();
  return networks.filter(
    (item) =>
      item.name?.toLowerCase().includes(q) ||
      item.key?.toString().includes(q) ||
      item.shortName?.toLowerCase().includes(q)
  );
});

function onKeydown(event: KeyboardEvent) {
  if (
    event.key === "/" &&
    !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)
  ) {
    event.preventDefault();
    document.querySelector('input[placeholder*="Search"]')?.focus();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div
    class="sticky top-0 h-screen w-full flex-shrink-0 flex flex-col bg-skin-bg border-r border-skin-border overflow-hidden"
  >
    <!-- Header -->
    <div :class="['pt-5 pb-4', isCollapsed ? 'px-3' : 'px-5']">
      <router-link
        to="/"
        class="flex items-center gap-3 group"
        :class="{ 'justify-center': isCollapsed }"
        @click="$emit('network-selected')"
      >
        <svg
          class="w-8 h-8 text-skin-heading transition-transform duration-300 group-hover:scale-110 flex-shrink-0"
          viewBox="0 0 300 300"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M200 300V100C255.228 100 300 144.772 300 200C300 255.228 255.228 300 200 300Z"
          />
          <path
            d="M0 100C0 44.772 44.772 0 100 0V200C44.772 200 0 155.228 0 100Z"
          />
          <path d="M100 100H300V0H200C144.771 0 100 44.772 100 100Z" />
          <path d="M200 200H0V300H100C155.229 300 200 255.228 200 200Z" />
        </svg>
        <div v-if="!isCollapsed">
          <h2
            class="text-lg font-semibold text-skin-heading tracking-tight leading-tight"
          >
            Snapshot
          </h2>
          <span
            class="text-[11px] font-medium text-skin-text uppercase tracking-widest"
            >Networks</span
          >
        </div>
      </router-link>
    </div>

    <!-- Search (hidden when collapsed) -->
    <div v-if="!isCollapsed" class="px-4 pb-3">
      <div class="relative">
        <svg
          class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-skin-text pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          v-model="search"
          placeholder="Search networks..."
          class="w-full pl-10 pr-4 py-2.5 bg-skin-border border border-skin-border rounded-xl text-sm text-skin-heading placeholder-skin-text focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200"
        />
        <kbd
          v-if="!search"
          class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-skin-text bg-skin-bg-alt rounded border border-skin-border"
          >/</kbd
        >
      </div>
    </div>

    <!-- Network count (hidden when collapsed) -->
    <div v-if="!isCollapsed" class="px-5 pb-2">
      <span
        class="text-[11px] font-medium text-skin-text uppercase tracking-wider"
      >
        {{ filteredNetworks.length }} network{{
          filteredNetworks.length !== 1 ? "s" : ""
        }}
      </span>
    </div>

    <!-- Network list -->
    <nav
      class="flex-1 overflow-y-auto pb-4"
      :class="isCollapsed ? 'px-1.5' : 'px-3'"
    >
      <ul :class="isCollapsed ? 'space-y-1' : 'space-y-0.5'">
        <li
          v-for="(item, index) in filteredNetworks"
          :key="index"
          class="animate-fade-in"
          :style="{
            animationDelay: `${Math.min(index * 20, 300)}ms`,
            animationFillMode: 'backwards',
          }"
        >
          <router-link
            :to="item.key"
            class="block"
            @click="$emit('network-selected')"
          >
            <!-- Collapsed view -->
            <div
              v-if="isCollapsed"
              :class="[
                'flex items-center justify-center py-2 rounded-xl transition-all duration-200',
                $route.params.id === item.key
                  ? 'bg-skin-primary text-skin-accent-foreground'
                  : 'text-skin-text hover:bg-white/[0.08]',
              ]"
              :title="item.name + ' (' + item.key + ')'"
            >
              <span
                :class="[
                  'network-chip text-[9px] !px-1.5 !py-0.5',
                  $route.params.id === item.key
                    ? '!bg-black/20 !text-skin-accent-foreground !border-black/20'
                    : '',
                ]"
              >
                {{ item.key }}
              </span>
            </div>
            <!-- Expanded view -->
            <div
              v-else
              :class="[
                'flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                $route.params.id === item.key
                  ? 'bg-skin-primary text-skin-accent-foreground'
                  : 'text-skin-text hover:bg-white/[0.08]',
              ]"
            >
              <span
                :class="[
                  'network-chip min-w-[2.5rem] text-center text-[10px]',
                  $route.params.id === item.key
                    ? '!bg-black/20 !text-skin-accent-foreground !border-black/20'
                    : 'group-hover:!bg-white/[0.08] group-hover:!border-white/[0.1]',
                ]"
              >
                {{ item.key }}
              </span>
              <span
                :class="[
                  'flex-1 min-w-0 text-sm font-medium truncate',
                  $route.params.id === item.key
                    ? 'text-skin-accent-foreground'
                    : 'text-skin-heading group-hover:text-skin-heading',
                ]"
                :title="item.name"
              >
                {{ item.name }}
              </span>
              <!-- Badges -->
              <div class="flex items-center gap-1 flex-shrink-0">
                <!-- Premium badge -->
                <span
                  v-if="
                    app.areSnapshotNetworksLoaded &&
                    app.snapshotNetworks[item.key]?.premium
                  "
                  class="w-4 h-4 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[9px] font-bold"
                  title="Premium Network"
                  >P</span
                >
                <!-- Testnet badge -->
                <span
                  v-if="item.testnet"
                  :class="[
                    'text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full leading-none',
                    $route.params.id === item.key
                      ? 'bg-blue-500/30 text-blue-200'
                      : 'bg-blue-500/15 text-blue-400',
                  ]"
                  title="Testnet Network"
                  >T</span
                >
                <!-- Invalid badge -->
                <span
                  v-if="
                    app.areSnapshotNetworksLoaded &&
                    !app.snapshotNetworks[item.key]
                  "
                  :class="[
                    'text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded-full leading-none',
                    $route.params.id === item.key
                      ? 'bg-red-500/30 text-red-200'
                      : 'bg-skin-error/15 text-skin-error',
                  ]"
                  title="Not found on Snapshot Hub API"
                  >!</span
                >
              </div>
            </div>
          </router-link>
        </li>
      </ul>
      <div
        v-if="!isCollapsed && filteredNetworks.length === 0"
        class="flex flex-col items-center justify-center py-12 text-skin-text"
      >
        <svg
          class="w-10 h-10 mb-3 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <p class="text-sm">No networks found</p>
      </div>
    </nav>
  </div>
</template>
