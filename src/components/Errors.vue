<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps<{
  rpcStatus: any[];
}>();

const isExpanded = ref(false);

const errorCount = computed(() => {
  if (!props.rpcStatus) return 0;
  return props.rpcStatus.filter((rpc: any) => rpc.status?.errors?.length > 0)
    .length;
});
</script>

<template>
  <div v-if="errorCount > 0" class="mt-6 animate-fade-in">
    <button
      @click="isExpanded = !isExpanded"
      class="flex items-center gap-2 px-1 mb-3 group w-full text-left"
    >
      <svg
        :class="[
          'w-3.5 h-3.5 text-skin-error transition-transform duration-200',
          isExpanded ? 'rotate-90' : '',
        ]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
      <span
        class="text-[11px] font-semibold text-skin-error uppercase tracking-wider"
      >
        {{ errorCount }} Error{{ errorCount !== 1 ? "s" : "" }}
      </span>
    </button>
    <Transition name="expand">
      <div v-show="isExpanded">
        <div v-for="rpc in rpcStatus" :key="rpc.index">
          <div
            class="glass-panel overflow-hidden mb-3 animate-fade-in"
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
                <p
                  class="text-sm font-semibold text-skin-error mb-1 truncate"
                  :title="typeof rpc.url === 'object' ? rpc.url.url : rpc.url"
                >
                  {{ typeof rpc.url === "object" ? rpc.url.url : rpc.url }}
                </p>
                <p
                  class="text-xs text-skin-text/80 leading-relaxed font-mono"
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
    </Transition>
  </div>
</template>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
