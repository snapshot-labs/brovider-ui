<script setup lang="ts">
import { ref } from "vue";
import { useApp } from "../composables/useApp";
import { useToast } from "../composables/useToast";

const { addRpcToNetwork } = useApp();
const toast = useToast();

const addRpcInput = ref(false);
const newRpcUrl = ref("");

function addRpc() {
  const url = newRpcUrl.value.trim();
  if (!url) return;
  addRpcToNetwork(url);
  newRpcUrl.value = "";
  addRpcInput.value = false;
  toast.success("RPC endpoint added");
}
</script>

<template>
  <tr>
    <td
      colspan="5"
      class="p-4 border-t border-skin-border/30 cursor-pointer group"
      tabindex="0"
      v-if="!addRpcInput"
      @click="addRpcInput = true"
      @keydown.enter="addRpcInput = true"
    >
      <div
        class="flex items-center gap-2 text-skin-text group-hover:text-skin-heading transition-colors duration-200"
      >
        <svg
          class="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="text-sm font-medium">Add RPC endpoint</span>
      </div>
    </td>
    <td
      colspan="5"
      class="p-4 border-t border-skin-border/30"
      v-if="addRpcInput"
    >
      <div class="flex items-center gap-3">
        <input
          type="text"
          class="flex-1 px-4 py-2.5 bg-skin-bg border border-skin-border rounded-xl text-sm text-skin-heading focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200"
          v-model="newRpcUrl"
          placeholder="https://rpc.example.com"
        />
        <button @click="addRpc()" class="btn-primary whitespace-nowrap">
          Add
        </button>
        <button
          @click="addRpcInput = false"
          class="btn-secondary whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    </td>
  </tr>
</template>
