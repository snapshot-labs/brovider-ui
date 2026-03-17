<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import NetworkSelect from "./NetworkSelect.vue";

const MIN_SIDEBAR_WIDTH = 64;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 288;

const isSidebarOpen = ref(false);
const isMobile = ref(false);
const sidebarWidth = ref(DEFAULT_SIDEBAR_WIDTH);
const isResizing = ref(false);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) isSidebarOpen.value = false;
}

function startResize(event: MouseEvent) {
  event.preventDefault();
  isResizing.value = true;
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";

  const onMouseMove = (e: MouseEvent) => {
    const newWidth = Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, e.clientX)
    );
    sidebarWidth.value = newWidth;
  };

  const onMouseUp = () => {
    isResizing.value = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}

onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkMobile);
});
</script>

<template>
  <div class="flex min-h-screen font-sans bg-skin-bg" v-cloak>
    <!-- Mobile top bar -->
    <div
      class="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-skin-bg/95 backdrop-blur-md border-b border-skin-border md:hidden"
    >
      <router-link to="/" class="flex items-center gap-2.5">
        <svg
          class="w-7 h-7 text-skin-heading"
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
        <span class="text-base font-semibold text-skin-heading">Snapshot</span>
      </router-link>
      <button
        @click="isSidebarOpen = !isSidebarOpen"
        class="p-2 -mr-2 rounded-xl text-skin-text hover:text-skin-heading hover:bg-skin-border transition-colors"
      >
        <svg
          v-if="!isSidebarOpen"
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        <svg
          v-else
          class="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>

    <!-- Mobile overlay -->
    <Transition name="fade">
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        @click="isSidebarOpen = false"
      ></div>
    </Transition>

    <!-- Sidebar -->
    <Transition name="slide">
      <div
        v-show="isSidebarOpen || !isMobile"
        :class="[
          'md:relative md:translate-x-0 md:block',
          'fixed inset-y-0 left-0 z-50',
          isMobile ? 'w-72' : '',
        ]"
        :style="!isMobile ? { width: sidebarWidth + 'px' } : undefined"
      >
        <NetworkSelect
          :sidebar-width="sidebarWidth"
          @network-selected="isSidebarOpen = false"
        />
        <div
          v-if="!isMobile"
          class="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group/resize z-10"
          @mousedown="startResize"
        >
          <div
            :class="[
              'w-full h-full transition-colors duration-150',
              isResizing ? 'bg-skin-primary/60' : 'hover:bg-skin-primary/30',
            ]"
          ></div>
        </div>
      </div>
    </Transition>

    <!-- Main content -->
    <div class="flex-1 min-w-0 p-4 pt-20 md:p-6 md:pt-6 lg:p-8">
      <router-view></router-view>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
