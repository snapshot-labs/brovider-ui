<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useApp } from "../composables/useApp";
import { useToast } from "../composables/useToast";

const { app, getChainIdFromRpc } = useApp();
const router = useRouter();
const toast = useToast();

const rpcInput = ref("");
const isResolving = ref(false);
const rpcError = ref("");

async function resolveRpc() {
  if (!rpcInput.value.trim()) return;
  isResolving.value = true;
  rpcError.value = "";

  try {
    const chainId = await getChainIdFromRpc(rpcInput.value.trim());
    if (!chainId) {
      rpcError.value = "Could not detect chain ID from this RPC endpoint.";
      toast.error("Failed to detect chain ID");
      return;
    }

    // Check if network exists in our networks list
    const networkExists = !!app.value.networks[chainId];

    if (networkExists) {
      // Add the RPC to the end of the network's RPC list if not already there
      const network = app.value.networks[chainId];
      const rpcUrl = rpcInput.value.trim();
      if (!network.rpc.includes(rpcUrl)) {
        network.rpc.push(rpcUrl);
      }
      toast.success(`Chain ${chainId} detected — opening network`);
      router.push(`/${chainId}?autoTest=1`);
    } else {
      // Create a temporary network entry
      app.value.networks[chainId] = {
        key: chainId,
        name: `Chain ${chainId}`,
        shortName: chainId,
        chainId: Number(chainId),
        network: chainId,
        multicall: "",
        rpc: [rpcInput.value.trim()],
        explorer: { url: "" },
        start: 0,
        logo: "",
      };
      toast.info(`Unknown chain ${chainId} — added with custom RPC`);
      router.push(`/${chainId}?autoTest=1`);
    }
  } catch (error) {
    rpcError.value = "Error connecting to RPC endpoint.";
    toast.error("Error connecting to RPC");
  } finally {
    isResolving.value = false;
  }
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center min-h-[50vh] md:min-h-[70vh] animate-fade-in px-4"
  >
    <div class="glass-panel p-8 sm:p-12 text-center max-w-md w-full">
      <svg
        class="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 text-skin-border"
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
      <h3 class="text-xl sm:text-2xl font-semibold text-skin-heading mb-2">
        Select a network
      </h3>
      <p class="text-skin-text text-sm mb-6">
        Choose a network from the sidebar to view its RPC nodes and performance
        metrics.
      </p>

      <!-- RPC URL input form -->
      <div class="border-t border-skin-border/50 pt-6">
        <p
          class="text-xs font-semibold text-skin-text uppercase tracking-wider mb-3"
        >
          Or test a custom RPC
        </p>
        <form @submit.prevent="resolveRpc" class="space-y-3">
          <input
            type="text"
            v-model="rpcInput"
            placeholder="https://rpc.example.com"
            class="w-full px-4 py-3 bg-skin-bg border border-skin-border rounded-xl text-sm text-skin-heading placeholder-skin-text focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200"
            :disabled="isResolving"
          />
          <button
            type="submit"
            :disabled="!rpcInput.trim() || isResolving"
            class="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="isResolving"
              class="w-4 h-4 mr-2 inline animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ isResolving ? "Detecting chain..." : "Detect Chain & Test" }}
          </button>
        </form>
        <p v-if="rpcError" class="mt-2 text-xs text-skin-error">
          {{ rpcError }}
        </p>
      </div>
    </div>
  </div>
</template>
