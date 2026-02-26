<script setup lang="ts">
defineProps<{
  rpcStatus: any[];
}>();
</script>

<template>
  <div class="mt-6">
    <div v-for="rpc in rpcStatus" :key="rpc.index">
      <div
        class="glass-panel overflow-hidden mb-4 animate-fade-in"
        v-if="rpc.status.errors && rpc.status.errors.length > 0"
      >
        <div class="flex">
          <div
            class="flex items-center justify-center w-12 flex-shrink-0"
            style="background-color: rgba(235, 76, 91, 0.15)"
          >
            <svg
              class="w-5 h-5 text-skin-error"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="px-4 py-3 min-w-0 flex-1">
            <p class="text-sm font-semibold text-skin-error mb-1 truncate">
              {{ rpc.url }}
            </p>
            <p
              class="text-sm text-skin-text leading-relaxed"
              v-for="(error, index) in rpc.status.errors"
              :key="index"
            >
              {{ error }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
