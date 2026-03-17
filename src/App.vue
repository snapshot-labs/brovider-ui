<script setup lang="ts">
import { onMounted } from "vue";
import { useApp } from "./composables/useApp";
import NetworksInterface from "./components/NetworksInterface.vue";
import ToastNotifications from "./components/ToastNotifications.vue";

const { init, app } = useApp();

onMounted(() => init());
</script>

<template>
  <ToastNotifications />
  <div
    v-if="app.isLoading"
    class="flex items-center justify-center min-h-screen bg-skin-bg"
  >
    <div class="flex flex-col items-center gap-4 animate-fade-in">
      <svg
        class="w-12 h-12 text-skin-heading animate-pulse"
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
      <span class="text-skin-text text-sm font-medium tracking-wide"
        >Loading networks...</span
      >
    </div>
  </div>
  <NetworksInterface v-else />
</template>
