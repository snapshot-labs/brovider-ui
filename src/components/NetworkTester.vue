<script setup lang="ts">
/* global ClipboardItem */
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import copy from "copy-to-clipboard";
import domtoimage from "dom-to-image";
import { useApp } from "../composables/useApp";
import { useToast } from "../composables/useToast";
import { getUrl } from "../helpers/utils";
import AddRPC from "./AddRPC.vue";
import Errors from "./Errors.vue";

const PLAY_ICON_PATH =
  "M16.6582 9.28638C18.098 10.1862 18.8178 10.6361 19.0647 11.2122C19.2803 11.7152 19.2803 12.2847 19.0647 12.7878C18.8178 13.3638 18.098 13.8137 16.6582 14.7136L9.896 18.94C8.29805 19.9387 7.49907 20.4381 6.83973 20.385C6.26501 20.3388 5.73818 20.0469 5.3944 19.584C5 19.053 5 18.1108 5 16.2264V7.77357C5 5.88919 5 4.94701 5.3944 4.41598C5.73818 3.9531 6.26501 3.66111 6.83973 3.6149C7.49907 3.5619 8.29805 4.06126 9.896 5.05998L16.6582 9.28638Z";

const {
  app,
  selectNetwork,
  testSingleRpc,
  testAllRpcs,
  testNodeLimit,
  testSnapshotNodeLimit,
  editNetworkButtonClick,
  editNetworksJSONButtonClick,
  changeNetworksObject,
} = useApp();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const snapshotInfo = computed(() => {
  const key = app.value.selectedNetwork?.key;
  if (!key || !app.value.areSnapshotNetworksLoaded) return null;
  return app.value.snapshotNetworks[key] || null;
});

const hasIdleRpcs = computed(() =>
  app.value.selectedNetwork?.rpcStatus?.some((rpc) => rpc.status.isIdle)
);

function explorerBlockUrl(block: number | string) {
  const base = app.value.selectedNetwork?.explorer?.url;
  if (!base || !block || block === "ERROR!" || block === "...") return "#";
  return `${base}/block/${block}`;
}

function archiveDotClass(status: string) {
  if (status === "Yes") return "bg-skin-success";
  if (status === "No") return "bg-skin-error";
  return "bg-skin-warning";
}

function isNodeLimitChecking(nodeLimit: string) {
  return typeof nodeLimit === "string" && nodeLimit.startsWith("checking");
}

function copyUrl(url: string | { url: string }) {
  const text = typeof url === "object" ? url.url : url;
  copy(text);
  toast.success("RPC URL copied");
}

function removeRpc(url: string | { url: string }) {
  app.value.networks[app.value.selectedNetwork.key].rpc = app.value.networks[
    app.value.selectedNetwork.key
  ].rpc.filter((a: string) => a !== url);
  selectNetwork(app.value.selectedNetwork.key);
  toast.info("RPC endpoint removed");
}

function refreshNetwork() {
  selectNetwork(app.value.selectedNetwork.key);
  toast.info("Refreshing network data…");
}

function applyChanges() {
  changeNetworksObject();
  toast.success("Network configuration updated");
}

function addRpcMobile() {
  app.value.networks[app.value.selectedNetwork.key].rpc.push(
    app.value.selectedNetwork.newRPC
  );
  selectNetwork(app.value.selectedNetwork.key);
  toast.success("RPC endpoint added");
}

async function imageCopy() {
  try {
    const node = document.getElementById("networkTester");
    const blob = await domtoimage.toBlob(node);

    navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    toast.success("Screenshot copied to clipboard");
  } catch (error) {
    toast.error("Failed to copy screenshot");
  }
}

onMounted(async () => {
  await selectNetwork(route.params.id as string);

  if (route.query.autoTest) {
    router.replace({ path: route.path });

    await testAllRpcs();
  }
});

router.afterEach(async (to, from) => {
  if (to.params.id !== from.params.id && route.params.id) {
    await selectNetwork(route.params.id as string);

    if (to.query.autoTest) {
      router.replace({ path: to.path });

      await testAllRpcs();
    }
  }
});
</script>

<template>
  <div v-if="app.selectedNetwork" class="animate-fade-in" id="networkTester">
    <!-- Header -->
    <div class="glass-panel-solid p-4 sm:p-6 mb-4 sm:mb-6">
      <div
        class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div class="flex items-center gap-3 sm:gap-4 min-w-0">
          <div class="relative flex-shrink-0">
            <img
              class="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl ring-1 ring-skin-border bg-skin-border p-1.5 object-contain"
              :src="getUrl(app.selectedNetwork.logo)"
              alt=""
              @error="$event.target.style.display = 'none'"
            />
            <div
              class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-skin-bg-alt flex items-center justify-center"
              style="background-color: rgba(87, 179, 117, 0.2)"
            >
              <div class="w-2 h-2 rounded-full bg-skin-success"></div>
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 sm:gap-3">
              <h2
                class="text-lg sm:text-2xl font-bold text-skin-heading truncate"
              >
                {{ app.selectedNetwork.name }}
              </h2>
              <span class="network-chip text-xs sm:text-sm">
                {{ app.selectedNetwork.key }}
              </span>
            </div>
            <div
              class="mt-0.5 sm:mt-1 flex items-center gap-2 text-xs sm:text-sm text-skin-text"
            >
              <span
                >{{ app.selectedNetwork.rpc?.length || 0 }} RPC node{{
                  app.selectedNetwork.rpc?.length !== 1 ? "s" : ""
                }}</span
              >
              <span v-if="snapshotInfo" class="text-skin-text/60">·</span>
              <span v-if="snapshotInfo" class="inline-flex items-center gap-1">
                <svg class="w-3 h-3" viewBox="0 0 300 300" fill="currentColor">
                  <path
                    d="M200 300V100C255.228 100 300 144.772 300 200C300 255.228 255.228 300 200 300Z"
                  />
                  <path
                    d="M0 100C0 44.772 44.772 0 100 0V200C44.772 200 0 155.228 0 100Z"
                  />
                  <path d="M100 100H300V0H200C144.771 0 100 44.772 100 100Z" />
                  <path
                    d="M200 200H0V300H100C155.229 300 200 255.228 200 200Z"
                  />
                </svg>
                {{ snapshotInfo.spacesCount.toLocaleString() }} space{{
                  snapshotInfo.spacesCount !== 1 ? "s" : ""
                }}
              </span>
              <span
                v-if="snapshotInfo?.premium"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
              >
                <svg
                  class="w-2.5 h-2.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
                Premium
              </span>
              <span
                v-if="app.selectedNetwork.testnet"
                class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/25"
              >
                Testnet
              </span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            @click="editNetworkButtonClick"
            class="btn-secondary text-xs sm:text-sm"
          >
            <svg
              class="w-4 h-4 mr-1 sm:mr-1.5 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </button>
          <button
            type="button"
            @click="editNetworksJSONButtonClick"
            class="btn-secondary text-xs sm:text-sm"
          >
            <svg
              class="w-4 h-4 mr-1 sm:mr-1.5 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            JSON
          </button>
          <button
            type="button"
            @click="refreshNetwork()"
            class="btn-primary text-xs sm:text-sm"
          >
            <svg
              class="w-4 h-4 mr-1 sm:mr-1.5 inline"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
          <button
            type="button"
            @click="imageCopy()"
            class="btn-secondary text-xs sm:text-sm px-2.5 sm:px-3"
            title="Copy as image"
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Network Panel -->
    <div
      v-if="app.isEditingNetwork"
      class="glass-panel-solid p-4 sm:p-6 mb-4 sm:mb-6 animate-fade-in"
    >
      <h3 class="text-lg font-semibold text-skin-heading mb-3">
        Edit Network Object
      </h3>
      <textarea
        v-model="app.newNetworkObject"
        class="w-full px-3 sm:px-4 py-3 bg-skin-bg border border-skin-border rounded-xl text-xs sm:text-sm text-skin-heading font-mono focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200 resize-y"
        rows="10"
        placeholder="Enter Network"
      ></textarea>
      <div class="flex items-center gap-2 mt-3">
        <button
          type="button"
          @click="app.isEditingNetwork = false"
          class="btn-secondary text-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          @click="applyChanges()"
          class="btn-primary text-sm"
        >
          Apply Changes
        </button>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="app.error"
      class="glass-panel overflow-hidden mb-4 sm:mb-6 border-skin-error/30 animate-fade-in"
    >
      <div
        class="flex items-center gap-3 p-3 sm:p-4"
        style="background-color: rgba(235, 76, 91, 0.08)"
      >
        <svg
          class="w-5 h-5 text-skin-error flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clip-rule="evenodd"
          />
        </svg>
        <span class="text-xs sm:text-sm text-skin-error font-medium">{{
          app.error
        }}</span>
      </div>
    </div>

    <!-- Snapshot RPC Section (desktop) -->
    <div
      v-if="app.selectedNetwork.snapshotRpcStatus"
      class="glass-panel-solid overflow-hidden hidden md:block mb-4 sm:mb-6"
    >
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-skin-border/50">
              <th
                scope="col"
                class="px-6 py-3 text-left text-[11px] font-semibold text-skin-text uppercase tracking-wider"
                colspan="5"
              >
                <span class="inline-flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full bg-skin-success animate-pulse"
                  ></span>
                  Snapshot Node
                </span>
              </th>
            </tr>
            <tr class="border-b border-skin-border/30">
              <th
                scope="col"
                class="px-6 py-3 text-left text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                RPC Endpoint
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Latest Block
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Archive Node
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Multicall Avg
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Node Limit
              </th>
            </tr>
          </thead>
          <tbody>
            <tr class="transition-colors duration-150 hover:bg-skin-border">
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click="
                        copyUrl(app.selectedNetwork.snapshotRpcStatus.url)
                      "
                      class="p-1 rounded-lg hover:bg-skin-border text-skin-text hover:text-skin-heading transition-colors"
                      title="Copy URL"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                  <span
                    class="text-sm font-mono text-skin-text truncate"
                    style="max-width: 420px"
                    >{{ app.selectedNetwork.snapshotRpcStatus.url }}</span
                  >
                </div>
              </td>
              <td
                v-if="app.selectedNetwork.snapshotRpcStatus.status.isLoading"
                colspan="4"
                class="px-6 py-4"
              >
                <div class="flex gap-3">
                  <div class="shimmer-bar flex-1"></div>
                  <div class="shimmer-bar flex-1"></div>
                  <div class="shimmer-bar flex-1"></div>
                  <div class="shimmer-bar flex-1"></div>
                </div>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!app.selectedNetwork.snapshotRpcStatus.status.isLoading"
              >
                <a
                  target="_blank"
                  :href="
                    explorerBlockUrl(
                      app.selectedNetwork.snapshotRpcStatus.status
                        .latestBlockNumber
                    )
                  "
                  class="group/block"
                >
                  <span
                    class="text-lg font-bold text-skin-heading tabular-nums group-hover/block:text-skin-link transition-colors"
                  >
                    {{
                      app.selectedNetwork.snapshotRpcStatus.status
                        .latestBlockNumber
                    }}
                  </span>
                </a>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!app.selectedNetwork.snapshotRpcStatus.status.isLoading"
              >
                <div class="space-y-1">
                  <div class="flex items-center justify-center gap-1.5">
                    <span
                      :class="[
                        'w-2 h-2 rounded-full',
                        archiveDotClass(
                          app.selectedNetwork.snapshotRpcStatus.status
                            .fullArchiveNode
                        ),
                      ]"
                    ></span>
                    <span class="text-sm font-medium text-skin-heading">{{
                      app.selectedNetwork.snapshotRpcStatus.status
                        .fullArchiveNode
                    }}</span>
                    <a
                      :href="explorerBlockUrl(1)"
                      target="_blank"
                      class="text-[10px] text-skin-text ml-1 hover:text-skin-heading hover:underline transition-colors"
                      title="Block #1"
                      >1st</a
                    >
                  </div>
                  <div class="flex items-center justify-center gap-1.5">
                    <span
                      :class="[
                        'w-2 h-2 rounded-full',
                        archiveDotClass(
                          app.selectedNetwork.snapshotRpcStatus.status
                            .fullArchiveNodeStart
                        ),
                      ]"
                    ></span>
                    <span class="text-sm font-medium text-skin-heading">{{
                      app.selectedNetwork.snapshotRpcStatus.status
                        .fullArchiveNodeStart
                    }}</span>
                    <a
                      :href="explorerBlockUrl(app.selectedNetwork.start)"
                      target="_blank"
                      class="text-[10px] text-skin-text ml-1 hover:text-skin-heading hover:underline transition-colors"
                      :title="`Block #${app.selectedNetwork.start}`"
                      >start</a
                    >
                  </div>
                </div>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!app.selectedNetwork.snapshotRpcStatus.status.isLoading"
              >
                <span
                  :class="[
                    'text-lg font-bold tabular-nums',
                    app.selectedNetwork.snapshotRpcStatus.status.multicall ===
                    'ERROR!'
                      ? 'text-skin-error'
                      : 'text-skin-heading',
                  ]"
                >
                  {{ app.selectedNetwork.snapshotRpcStatus.status.multicall }}
                </span>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!app.selectedNetwork.snapshotRpcStatus.status.isLoading"
              >
                <button
                  v-if="
                    app.selectedNetwork.snapshotRpcStatus.status.nodeLimit ===
                    'idle'
                  "
                  @click="testSnapshotNodeLimit()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
                  </svg>
                  Test
                </button>
                <div
                  v-else-if="
                    isNodeLimitChecking(
                      app.selectedNetwork.snapshotRpcStatus.status.nodeLimit
                    )
                  "
                  class="flex items-center justify-center gap-1.5"
                >
                  <svg
                    class="w-3 h-3 animate-spin text-skin-text"
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
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span class="text-xs text-skin-text">{{
                    app.selectedNetwork.snapshotRpcStatus.status.nodeLimit
                  }}</span>
                </div>
                <span
                  v-else
                  :class="[
                    'text-lg font-bold tabular-nums',
                    app.selectedNetwork.snapshotRpcStatus.status.nodeLimit ===
                    'ERROR!'
                      ? 'text-skin-error'
                      : 'text-skin-heading',
                  ]"
                >
                  {{ app.selectedNetwork.snapshotRpcStatus.status.nodeLimit }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Snapshot RPC Section (mobile) -->
    <div v-if="app.selectedNetwork.snapshotRpcStatus" class="md:hidden mb-4">
      <div class="flex items-center gap-2 px-1 mb-2">
        <span class="w-2 h-2 rounded-full bg-skin-success animate-pulse"></span>
        <span
          class="text-[11px] font-semibold text-skin-text uppercase tracking-wider"
          >Snapshot Node</span
        >
      </div>
      <div class="glass-panel-solid p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <span
            class="text-xs font-mono text-skin-text break-all leading-relaxed flex-1"
            >{{ app.selectedNetwork.snapshotRpcStatus.url }}</span
          >
          <button
            @click="copyUrl(app.selectedNetwork.snapshotRpcStatus.url)"
            class="p-1.5 rounded-lg hover:bg-skin-border text-skin-text hover:text-skin-heading transition-colors flex-shrink-0"
            title="Copy URL"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>
        <div
          v-if="app.selectedNetwork.snapshotRpcStatus.status.isLoading"
          class="space-y-2"
        >
          <div class="shimmer-bar w-3/4 h-4"></div>
          <div class="shimmer-bar w-1/2 h-4"></div>
        </div>
        <div v-else class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Latest Block</span
            >
            <a
              target="_blank"
              :href="
                explorerBlockUrl(
                  app.selectedNetwork.snapshotRpcStatus.status.latestBlockNumber
                )
              "
            >
              <span
                class="text-base font-bold text-skin-heading tabular-nums hover:text-skin-link transition-colors block"
                >{{
                  app.selectedNetwork.snapshotRpcStatus.status.latestBlockNumber
                }}</span
              >
            </a>
          </div>
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Archive Node</span
            >
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span
                  :class="[
                    'w-2 h-2 rounded-full',
                    archiveDotClass(
                      app.selectedNetwork.snapshotRpcStatus.status
                        .fullArchiveNode
                    ),
                  ]"
                ></span>
                <span class="text-sm font-medium text-skin-heading">{{
                  app.selectedNetwork.snapshotRpcStatus.status.fullArchiveNode
                }}</span>
                <a
                  :href="explorerBlockUrl(1)"
                  target="_blank"
                  class="text-[10px] text-skin-text ml-0.5 hover:text-skin-heading hover:underline transition-colors"
                  >1st</a
                >
              </div>
              <div class="flex items-center gap-1.5">
                <span
                  :class="[
                    'w-2 h-2 rounded-full',
                    archiveDotClass(
                      app.selectedNetwork.snapshotRpcStatus.status
                        .fullArchiveNodeStart
                    ),
                  ]"
                ></span>
                <span class="text-sm font-medium text-skin-heading">{{
                  app.selectedNetwork.snapshotRpcStatus.status
                    .fullArchiveNodeStart
                }}</span>
                <a
                  :href="explorerBlockUrl(app.selectedNetwork.start)"
                  target="_blank"
                  class="text-[10px] text-skin-text ml-0.5 hover:text-skin-heading hover:underline transition-colors"
                  >start</a
                >
              </div>
            </div>
          </div>
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Multicall Avg</span
            >
            <span
              :class="[
                'text-base font-bold tabular-nums block',
                app.selectedNetwork.snapshotRpcStatus.status.multicall ===
                'ERROR!'
                  ? 'text-skin-error'
                  : 'text-skin-heading',
              ]"
              >{{
                app.selectedNetwork.snapshotRpcStatus.status.multicall
              }}</span
            >
          </div>
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Node Limit</span
            >
            <button
              v-if="
                app.selectedNetwork.snapshotRpcStatus.status.nodeLimit ===
                'idle'
              "
              @click="testSnapshotNodeLimit()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
            >
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
              </svg>
              Test
            </button>
            <div
              v-else-if="
                isNodeLimitChecking(
                  app.selectedNetwork.snapshotRpcStatus.status.nodeLimit
                )
              "
              class="flex items-center gap-1.5"
            >
              <svg
                class="w-3 h-3 animate-spin text-skin-text"
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
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span class="text-xs text-skin-text">{{
                app.selectedNetwork.snapshotRpcStatus.status.nodeLimit
              }}</span>
            </div>
            <span
              v-else
              :class="[
                'text-base font-bold tabular-nums block',
                app.selectedNetwork.snapshotRpcStatus.status.nodeLimit ===
                'ERROR!'
                  ? 'text-skin-error'
                  : 'text-skin-heading',
              ]"
              >{{
                app.selectedNetwork.snapshotRpcStatus.status.nodeLimit
              }}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- RPC Table (desktop) -->
    <div class="glass-panel-solid overflow-hidden hidden md:block">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-skin-border/50">
              <th
                scope="col"
                class="px-6 py-3 text-left text-[11px] font-semibold text-skin-text uppercase tracking-wider"
                colspan="5"
              >
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-2">
                    <span
                      class="w-2 h-2 rounded-full bg-skin-success animate-pulse"
                    ></span>
                    {{ app.selectedNetwork.rpc.length }} Node{{
                      app.selectedNetwork.rpc.length !== 1 ? "s" : ""
                    }}
                  </span>
                  <button
                    v-if="hasIdleRpcs"
                    @click="testAllRpcs()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-lg bg-skin-primary text-skin-accent-foreground hover:opacity-90 transition-opacity"
                  >
                    <svg
                      class="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
                    </svg>
                    Test All
                  </button>
                </div>
              </th>
            </tr>
            <tr class="border-b border-skin-border/30">
              <th
                scope="col"
                class="px-6 py-3 text-left text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                RPC Endpoint
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Latest Block
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Archive Node
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Multicall Avg
              </th>
              <th
                scope="col"
                class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider"
              >
                Node Limit
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-skin-border/20">
            <tr
              v-for="(rpc, index) in app.selectedNetwork.rpcStatus"
              v-bind:key="index"
              class="transition-colors duration-150 hover:bg-skin-border"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-2 min-w-0">
                  <div class="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      @click="copyUrl(rpc.url)"
                      class="p-1 rounded-lg hover:bg-skin-border text-skin-text hover:text-skin-heading transition-colors"
                      title="Copy URL"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      @click="removeRpc(rpc.url)"
                      class="p-1 rounded-lg text-skin-text hover:text-skin-error transition-colors"
                      title="Remove RPC"
                    >
                      <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                  <span
                    class="text-sm font-mono text-skin-text truncate"
                    style="max-width: 420px"
                  >
                    {{ typeof rpc.url === "object" ? rpc.url.url : rpc.url }}
                  </span>
                </div>
              </td>
              <td v-if="rpc.status.isIdle" colspan="4" class="px-6 py-4">
                <button
                  @click="testSingleRpc(rpc.index)"
                  class="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
                >
                  <svg
                    class="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
                  </svg>
                  Test
                </button>
              </td>
              <td
                v-else-if="rpc.status.isLoading"
                colspan="4"
                class="px-6 py-4"
              >
                <div class="flex gap-3">
                  <div class="shimmer-bar flex-1"></div>
                  <div class="shimmer-bar flex-1"></div>
                  <div class="shimmer-bar flex-1"></div>
                  <div class="shimmer-bar flex-1"></div>
                </div>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!rpc.status.isLoading && !rpc.status.isIdle"
              >
                <a
                  target="_blank"
                  :href="explorerBlockUrl(rpc.status.latestBlockNumber)"
                  class="group/block"
                >
                  <span
                    class="text-lg font-bold text-skin-heading tabular-nums group-hover/block:text-skin-link transition-colors"
                  >
                    {{ rpc.status.latestBlockNumber }}
                  </span>
                </a>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!rpc.status.isLoading && !rpc.status.isIdle"
              >
                <div class="space-y-1">
                  <div class="flex items-center justify-center gap-1.5">
                    <span
                      :class="[
                        'w-2 h-2 rounded-full',
                        archiveDotClass(rpc.status.fullArchiveNode),
                      ]"
                    ></span>
                    <span class="text-sm font-medium text-skin-heading">{{
                      rpc.status.fullArchiveNode
                    }}</span>
                    <a
                      :href="explorerBlockUrl(1)"
                      target="_blank"
                      class="text-[10px] text-skin-text ml-1 hover:text-skin-heading hover:underline transition-colors"
                      title="Block #1"
                      >1st</a
                    >
                  </div>
                  <div class="flex items-center justify-center gap-1.5">
                    <span
                      :class="[
                        'w-2 h-2 rounded-full',
                        archiveDotClass(rpc.status.fullArchiveNodeStart),
                      ]"
                    ></span>
                    <span class="text-sm font-medium text-skin-heading">{{
                      rpc.status.fullArchiveNodeStart
                    }}</span>
                    <a
                      :href="explorerBlockUrl(app.selectedNetwork.start)"
                      target="_blank"
                      class="text-[10px] text-skin-text ml-1 hover:text-skin-heading hover:underline transition-colors"
                      :title="`Block #${app.selectedNetwork.start}`"
                      >start</a
                    >
                  </div>
                </div>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!rpc.status.isLoading && !rpc.status.isIdle"
              >
                <span
                  :class="[
                    'text-lg font-bold tabular-nums',
                    rpc.status.multicall === 'ERROR!'
                      ? 'text-skin-error'
                      : 'text-skin-heading',
                  ]"
                >
                  {{ rpc.status.multicall }}
                </span>
              </td>
              <td
                class="px-6 py-4 text-center"
                v-if="!rpc.status.isLoading && !rpc.status.isIdle"
              >
                <button
                  v-if="rpc.status.nodeLimit === 'idle'"
                  @click="testNodeLimit(rpc.index)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
                >
                  <svg
                    class="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
                  </svg>
                  Test
                </button>
                <div
                  v-else-if="isNodeLimitChecking(rpc.status.nodeLimit)"
                  class="flex items-center justify-center gap-1.5"
                >
                  <svg
                    class="w-3 h-3 animate-spin text-skin-text"
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
                    />
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span class="text-xs text-skin-text">{{
                    rpc.status.nodeLimit
                  }}</span>
                </div>
                <span
                  v-else
                  :class="[
                    'text-lg font-bold tabular-nums',
                    rpc.status.nodeLimit === 'ERROR!'
                      ? 'text-skin-error'
                      : 'text-skin-heading',
                  ]"
                >
                  {{ rpc.status.nodeLimit }}
                </span>
              </td>
            </tr>
            <AddRPC />
          </tbody>
        </table>
      </div>
    </div>

    <!-- RPC Cards (mobile) -->
    <div class="md:hidden space-y-3">
      <div class="flex items-center justify-between px-1 mb-2">
        <div class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full bg-skin-success animate-pulse"
          ></span>
          <span
            class="text-[11px] font-semibold text-skin-text uppercase tracking-wider"
          >
            {{ app.selectedNetwork.rpc.length }} Node{{
              app.selectedNetwork.rpc.length !== 1 ? "s" : ""
            }}
          </span>
        </div>
        <button
          v-if="hasIdleRpcs"
          @click="testAllRpcs()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
        >
          <svg
            class="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
          </svg>
          Test All
        </button>
      </div>

      <div
        v-for="(rpc, index) in app.selectedNetwork.rpcStatus"
        :key="'m-' + index"
        class="glass-panel-solid p-4 space-y-3"
      >
        <!-- RPC URL + actions -->
        <div class="flex items-start justify-between gap-2">
          <span
            class="text-xs font-mono text-skin-text break-all leading-relaxed flex-1"
          >
            {{ typeof rpc.url === "object" ? rpc.url.url : rpc.url }}
          </span>
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              @click="copyUrl(rpc.url)"
              class="p-1.5 rounded-lg hover:bg-skin-border text-skin-text hover:text-skin-heading transition-colors"
              title="Copy URL"
            >
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
            <button
              @click="removeRpc(rpc.url)"
              class="p-1.5 rounded-lg text-skin-text hover:text-skin-error transition-colors"
              title="Remove RPC"
            >
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Idle state -->
        <div v-if="rpc.status.isIdle" class="py-3">
          <button
            @click="testSingleRpc(rpc.index)"
            class="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
            </svg>
            Test
          </button>
        </div>

        <!-- Loading shimmer -->
        <div v-else-if="rpc.status.isLoading" class="space-y-2">
          <div class="shimmer-bar w-3/4 h-4"></div>
          <div class="shimmer-bar w-1/2 h-4"></div>
        </div>

        <!-- Stats grid -->
        <div v-else class="grid grid-cols-2 gap-3">
          <!-- Latest Block -->
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Latest Block</span
            >
            <a
              target="_blank"
              :href="explorerBlockUrl(rpc.status.latestBlockNumber)"
            >
              <span
                class="text-base font-bold text-skin-heading tabular-nums hover:text-skin-link transition-colors block"
              >
                {{ rpc.status.latestBlockNumber }}
              </span>
            </a>
          </div>

          <!-- Archive Node -->
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Archive Node</span
            >
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span
                  :class="[
                    'w-2 h-2 rounded-full',
                    archiveDotClass(rpc.status.fullArchiveNode),
                  ]"
                ></span>
                <span class="text-sm font-medium text-skin-heading">{{
                  rpc.status.fullArchiveNode
                }}</span>
                <a
                  :href="explorerBlockUrl(1)"
                  target="_blank"
                  class="text-[10px] text-skin-text ml-0.5 hover:text-skin-heading hover:underline transition-colors"
                  title="Block #1"
                  >1st</a
                >
              </div>
              <div class="flex items-center gap-1.5">
                <span
                  :class="[
                    'w-2 h-2 rounded-full',
                    archiveDotClass(rpc.status.fullArchiveNodeStart),
                  ]"
                ></span>
                <span class="text-sm font-medium text-skin-heading">{{
                  rpc.status.fullArchiveNodeStart
                }}</span>
                <a
                  :href="explorerBlockUrl(app.selectedNetwork.start)"
                  target="_blank"
                  class="text-[10px] text-skin-text ml-0.5 hover:text-skin-heading hover:underline transition-colors"
                  :title="`Block #${app.selectedNetwork.start}`"
                  >start</a
                >
              </div>
            </div>
          </div>

          <!-- Multicall -->
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Multicall Avg</span
            >
            <span
              :class="[
                'text-base font-bold tabular-nums block',
                rpc.status.multicall === 'ERROR!'
                  ? 'text-skin-error'
                  : 'text-skin-heading',
              ]"
            >
              {{ rpc.status.multicall }}
            </span>
          </div>

          <!-- Node Limit -->
          <div class="space-y-1">
            <span
              class="text-[10px] font-semibold text-skin-text uppercase tracking-wider"
              >Node Limit</span
            >
            <button
              v-if="rpc.status.nodeLimit === 'idle'"
              @click="testNodeLimit(rpc.index)"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors"
            >
              <svg
                class="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linejoin="round" :d="PLAY_ICON_PATH" />
              </svg>
              Test
            </button>
            <div
              v-else-if="isNodeLimitChecking(rpc.status.nodeLimit)"
              class="flex items-center gap-1.5"
            >
              <svg
                class="w-3 h-3 animate-spin text-skin-text"
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
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span class="text-xs text-skin-text">{{
                rpc.status.nodeLimit
              }}</span>
            </div>
            <span
              v-else
              :class="[
                'text-base font-bold tabular-nums block',
                rpc.status.nodeLimit === 'ERROR!'
                  ? 'text-skin-error'
                  : 'text-skin-heading',
              ]"
            >
              {{ rpc.status.nodeLimit }}
            </span>
          </div>
        </div>
      </div>

      <!-- Mobile Add RPC -->
      <div class="glass-panel-solid overflow-hidden">
        <div
          v-if="!app.selectedNetwork.addRPCInput"
          class="p-4 cursor-pointer group"
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
        </div>
        <div v-else class="p-4 space-y-3">
          <input
            type="text"
            class="w-full px-3 py-2.5 bg-skin-bg border border-skin-border rounded-xl text-sm text-skin-heading focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200"
            v-model="app.selectedNetwork.newRPC"
            placeholder="https://rpc.example.com"
          />
          <div class="flex items-center gap-2">
            <button @click="addRpcMobile()" class="btn-primary text-sm flex-1">
              Add
            </button>
            <button
              @click="app.selectedNetwork.addRPCInput = false"
              class="btn-secondary text-sm flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Errors :rpcStatus="app.selectedNetwork?.rpcStatus" />
</template>
