<script setup lang="ts">
import { useApp } from "../composables/useApp";
import { useToast } from "../composables/useToast";

const { app, selectNetwork } = useApp();
const toast = useToast();

function addRpc() {
  app.value.networks[app.value.selectedNetwork.key].rpc.push(
    app.value.selectedNetwork.newRPC
  );
  selectNetwork(app.value.selectedNetwork.key);
  toast.success("RPC endpoint added");
}
</script>

<template>
  <tr>
    <td
      colspan="5"
      class="p-4 border-t border-skin-border/30 cursor-pointer group"
      v-if="!app.selectedNetwork.addRPCInput"
      @click="app.selectedNetwork.addRPCInput = true"
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
      v-if="app.selectedNetwork.addRPCInput"
    >
      <div class="flex items-center gap-3">
        <input
          type="text"
          class="flex-1 px-4 py-2.5 bg-skin-bg border border-skin-border rounded-xl text-sm text-skin-heading focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200"
          v-model="app.selectedNetwork.newRPC"
          placeholder="https://rpc.example.com"
        />
        <button @click="addRpc()" class="btn-primary whitespace-nowrap">
          Add
        </button>
        <button
          @click="app.selectedNetwork.addRPCInput = false"
          class="btn-secondary whitespace-nowrap"
        >
          Cancel
        </button>
      </div>
    </td>
  </tr>
</template>
