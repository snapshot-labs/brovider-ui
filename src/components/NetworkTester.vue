<script setup lang="ts">
/* global ClipboardItem */
import { ref, computed, onMounted, onUnmounted } from "vue";
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
  toggleFavorite,
  addChainlistRpc,
  prefetchChainlist,
  addRpcToNetwork,
} = useApp();
const toast = useToast();
const route = useRoute();
const router = useRouter();

const snapshotInfo = computed(() => {
  const key = app.value.selectedNetwork?.key;
  if (!key || !app.value.areSnapshotNetworksLoaded) return null;
  return app.value.snapshotNetworks[key] || null;
});

function explorerBlockUrl(block: number | string): string | null {
  const base = app.value.selectedNetwork?.explorer?.url;
  if (
    !base ||
    !block ||
    block === "ERROR!" ||
    block === "NOT WORKING" ||
    block === "..." ||
    block === "-"
  )
    return null;
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

function formatBlock(block: number | string) {
  if (typeof block === "number") return block.toLocaleString();
  return block;
}

function multicallColorClass(multicall: string) {
  if (multicall === "ERROR!") return "text-skin-error";
  const ms = parseFloat(multicall);
  if (isNaN(ms)) return "text-skin-heading";
  if (ms < 200) return "text-skin-success";
  if (ms < 500) return "text-skin-warning";
  return "text-skin-error";
}

function isNotWorking(status: any) {
  return status?.latestBlockNumber === "NOT WORKING";
}

function copyUrl(url: string | Record<string, any>) {
  copy(getRpcUrl(url));
  toast.success("RPC URL copied");
}

function getRpcUrl(url: string | Record<string, any>) {
  return typeof url === "object" ? url.url : url;
}

function removeRpc(url: string | Record<string, any>) {
  const urlStr = getRpcUrl(url);
  const network = app.value.selectedNetwork!;
  app.value.networks[network.key].rpc = app.value.networks[
    network.key
  ].rpc.filter(
    (a: string | Record<string, any>) =>
      (typeof a === "object" ? a.url : a) !== urlStr
  );
  selectNetwork(network.key);
  toast.info("RPC endpoint removed");
}

function refreshNetwork() {
  selectNetwork(app.value.selectedNetwork!.key);
  toast.info("Refreshing network data…");
}

function applyChanges() {
  changeNetworksObject();
  toast.success("Network configuration updated");
}

function addRpcMobile() {
  addRpcToNetwork(newRpcUrl.value);
  newRpcUrl.value = '';
  addRpcInput.value = false;
  toast.success("RPC endpoint added");
}

async function handleAddChainlistRpc() {
  try {
    const { added, remaining } = await addChainlistRpc();

    if (!added) {
      toast.info('No more Chainlist RPCs available for this network');
      return;
    }
    const host = new URL(added).hostname;

    toast.success(`Added ${host}` + (remaining > 0 ? ` (${remaining} more available)` : ''));
  } catch (error) {
    toast.error((error as Error).message);
  }
}

async function imageCopy() {
  try {
    const node = document.getElementById("networkTester") as HTMLElement;
    const blob = await domtoimage.toBlob(node as unknown as Node, {});

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

    await testAllRpcsAndTrack();
  }
});

router.afterEach(async (to, from) => {
  if (to.params.id !== from.params.id && route.params.id) {
    addRpcInput.value = false;
    newRpcUrl.value = '';
    await selectNetwork(route.params.id as string);

    if (to.query.autoTest) {
      router.replace({ path: to.path });

      await testAllRpcsAndTrack();
    }
  }
});

const isShowingShortcuts = ref(false);
const isExportDropdownOpen = ref(false);
const addRpcInput = ref(false);
const newRpcUrl = ref('');

const isFavorited = computed(() => {
  const key = app.value.selectedNetwork?.key;
  return key ? !!app.value.favoriteNetworks[key] : false;
});

type RpcFilterType = 'all' | 'working' | 'failing';
const rpcFilter = ref<RpcFilterType>('all');
const RPC_FILTER_OPTIONS: RpcFilterType[] = ['all', 'working', 'failing'];

function cycleRpcFilter() {
  const currentIndex = RPC_FILTER_OPTIONS.indexOf(rpcFilter.value);
  rpcFilter.value = RPC_FILTER_OPTIONS[(currentIndex + 1) % RPC_FILTER_OPTIONS.length];
}

const testSummary = computed(() => {
  const rpcStatus = app.value.selectedNetwork?.rpcStatus;
  if (!rpcStatus) return null;

  const tested = rpcStatus.filter(
    (rpc: any) => !rpc.status.isIdle && !rpc.status.isLoading
  );
  if (tested.length === 0) return null;

  const working = tested.filter(
    (rpc: any) => rpc.status.latestBlockNumber !== "NOT WORKING"
  );
  const multicallValues = working
    .map((rpc: any) => parseFloat(rpc.status.multicall))
    .filter((v: number) => !isNaN(v));

  const bestMs = multicallValues.length > 0 ? Math.min(...multicallValues) : null;
  const avgMs =
    multicallValues.length > 0
      ? multicallValues.reduce((a: number, b: number) => a + b, 0) / multicallValues.length
      : null;

  return {
    working: working.length,
    total: tested.length,
    bestMs,
    avgMs,
    isAllTested: tested.length === rpcStatus.length,
  };
});

const maxMulticallMs = computed(() => {
  const rpcStatus = app.value.selectedNetwork?.rpcStatus;
  if (!rpcStatus) return 0;

  const values = rpcStatus
    .map((rpc: any) => parseFloat(rpc.status?.multicall))
    .filter((v: number) => !isNaN(v));

  return values.length > 0 ? Math.max(...values) : 0;
});

function multicallBarWidth(multicall: string) {
  const ms = parseFloat(multicall);
  if (isNaN(ms) || maxMulticallMs.value === 0) return "0%";
  return Math.min(100, (ms / maxMulticallMs.value) * 100) + "%";
}

function multicallBarColor(multicall: string) {
  if (multicall === "ERROR!") return "bg-skin-error/30";
  const ms = parseFloat(multicall);
  if (isNaN(ms)) return "bg-skin-border";
  if (ms < 200) return "bg-skin-success/40";
  if (ms < 500) return "bg-yellow-500/40";
  return "bg-skin-error/40";
}

const maxBlockNumber = computed(() => {
  const network = app.value.selectedNetwork;
  if (!network) return 0;
  const blocks: number[] = [];
  const snapshotBlock = (network.snapshotRpcStatus?.status as any)?.latestBlockNumber;
  if (typeof snapshotBlock === 'number') blocks.push(snapshotBlock);
  for (const rpc of network.rpcStatus || []) {
    const block = (rpc.status as any)?.latestBlockNumber;
    if (typeof block === 'number') blocks.push(block);
  }
  return blocks.length > 0 ? Math.max(...blocks) : 0;
});

function blockLag(blockNumber: number | string): number | null {
  if (typeof blockNumber !== 'number' || maxBlockNumber.value === 0) return null;
  return maxBlockNumber.value - blockNumber;
}

function blockLagClass(lag: number | null): string {
  if (lag === null) return '';
  if (lag <= 1) return 'text-skin-success';
  if (lag <= 5) return 'text-skin-warning';
  return 'text-skin-error';
}

type SortColumn = 'block' | 'archive' | 'multicall' | null;
const sortColumn = ref<SortColumn>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');

function toggleSort(col: SortColumn) {
  if (sortColumn.value === col) {
    if (sortDirection.value === 'asc') {
      sortDirection.value = 'desc';
    } else {
      sortColumn.value = null;
      sortDirection.value = 'asc';
    }
  } else {
    sortColumn.value = col;
    sortDirection.value = 'asc';
  }
}

const sortedRpcStatus = computed(() => {
  const rpcStatus = app.value.selectedNetwork?.rpcStatus;
  if (!rpcStatus || !sortColumn.value) return rpcStatus;
  return [...rpcStatus].sort((a: any, b: any) => {
    const dir = sortDirection.value === 'asc' ? 1 : -1;
    const aReady = !a.status.isIdle && !a.status.isLoading;
    const bReady = !b.status.isIdle && !b.status.isLoading;
    if (!aReady && !bReady) return 0;
    if (!aReady) return 1;
    if (!bReady) return -1;
    if (sortColumn.value === 'block') {
      const aBlock = typeof a.status.latestBlockNumber === 'number' ? a.status.latestBlockNumber : -1;
      const bBlock = typeof b.status.latestBlockNumber === 'number' ? b.status.latestBlockNumber : -1;
      return (aBlock - bBlock) * dir;
    }
    if (sortColumn.value === 'multicall') {
      const aMs = parseFloat(a.status.multicall) || Infinity;
      const bMs = parseFloat(b.status.multicall) || Infinity;
      return (aMs - bMs) * dir;
    }
    if (sortColumn.value === 'archive') {
      const order: Record<string, number> = { 'Yes': 0, 'No': 1, 'ERROR!': 2, '-': 3 };
      const aOrder = order[a.status.fullArchiveNode] ?? 4;
      const bOrder = order[b.status.fullArchiveNode] ?? 4;
      return (aOrder - bOrder) * dir;
    }
    return 0;
  });
});

const filteredRpcStatus = computed(() => {
  const list = sortedRpcStatus.value;
  if (!list || rpcFilter.value === 'all') return list;
  return list.filter((rpc: any) => {
    if (rpc.status.isIdle || rpc.status.isLoading) return true;
    const isWorking = rpc.status.latestBlockNumber !== 'NOT WORKING';
    return rpcFilter.value === 'working' ? isWorking : !isWorking;
  });
});

const snapshotRanking = computed(() => {
  const network = app.value.selectedNetwork;
  if (!network?.snapshotRpcStatus?.status) return null;
  const snapshotMs = parseFloat((network.snapshotRpcStatus.status as any).multicall);
  if (isNaN(snapshotMs)) return null;
  const allMs: number[] = [snapshotMs];
  for (const rpc of network.rpcStatus || []) {
    const ms = parseFloat((rpc.status as any)?.multicall);
    if (!isNaN(ms)) allMs.push(ms);
  }
  if (allMs.length < 2) return null;
  allMs.sort((a, b) => a - b);
  const rank = allMs.indexOf(snapshotMs) + 1;
  return { rank, total: allMs.length };
});

const lastTestedAt = ref<Date | null>(null);
const lastTestedLabel = ref('');
let lastTestedTimer: ReturnType<typeof setInterval> | null = null;

function updateLastTestedLabel() {
  if (!lastTestedAt.value) {
    lastTestedLabel.value = '';
    return;
  }
  const seconds = Math.floor((Date.now() - lastTestedAt.value.getTime()) / 1000);
  if (seconds < 5) lastTestedLabel.value = 'just now';
  else if (seconds < 60) lastTestedLabel.value = `${seconds}s ago`;
  else if (seconds < 3600) lastTestedLabel.value = `${Math.floor(seconds / 60)}m ago`;
  else lastTestedLabel.value = `${Math.floor(seconds / 3600)}h ago`;
}

async function testAllRpcsAndTrack() {
  await testAllRpcs();
  lastTestedAt.value = new Date();
}

function copyResultsAsMarkdown() {
  const network = app.value.selectedNetwork;
  if (!network) return;

  const lines: string[] = [];
  lines.push(`## ${network.name} (Chain ${network.key})`);
  lines.push("");

  const snapshotRpc = network.snapshotRpcStatus;
  if (snapshotRpc && !snapshotRpc.status.isLoading && !snapshotRpc.status.isIdle) {
    const s = snapshotRpc.status;
    lines.push("### Snapshot Node");
    lines.push(`- **Block:** ${typeof s.latestBlockNumber === "number" ? s.latestBlockNumber.toLocaleString() : s.latestBlockNumber}`);
    lines.push(`- **Archive:** ${s.fullArchiveNode}`);
    lines.push(`- **Multicall:** ${s.multicall}`);
    lines.push("");
  }

  const tested = network.rpcStatus?.filter(
    (rpc: any) => !rpc.status.isIdle && !rpc.status.isLoading
  );

  if (tested && tested.length > 0) {
    lines.push("### RPC Nodes");
    lines.push("");
    lines.push("| RPC Endpoint | Block | Archive | Multicall |");
    lines.push("|---|---|---|---|");
    for (const rpc of tested) {
      const url = typeof rpc.url === "object" ? rpc.url.url : rpc.url;
      const block = typeof rpc.status.latestBlockNumber === "number"
        ? rpc.status.latestBlockNumber.toLocaleString()
        : rpc.status.latestBlockNumber;
      const archive = rpc.status.fullArchiveNode;
      const mc = rpc.status.multicall;
      lines.push(`| \`${url}\` | ${block} | ${archive} | ${mc} |`);
    }
    lines.push("");
  }

  if (testSummary.value) {
    const s = testSummary.value;
    lines.push(`**Summary:** ${s.working}/${s.total} working`);
    if (s.bestMs !== null) lines.push(` · Best: ${s.bestMs.toFixed(2)} ms`);
    if (s.avgMs !== null) lines.push(` · Avg: ${s.avgMs.toFixed(2)} ms`);
  }

  copy(lines.join("\n"));

  toast.success("Results copied as markdown");
}

function exportResultsAsJson() {
  const network = app.value.selectedNetwork;
  if (!network) return;

  const result: any = {
    network: network.name,
    chainId: network.key,
    testedAt: new Date().toISOString(),
    snapshotRpc: null,
    rpcs: [],
  };

  const snapshotRpc = network.snapshotRpcStatus;
  if (snapshotRpc && !snapshotRpc.status.isLoading && !snapshotRpc.status.isIdle) {
    result.snapshotRpc = {
      url: typeof snapshotRpc.url === 'object' ? snapshotRpc.url.url : snapshotRpc.url,
      latestBlock: snapshotRpc.status.latestBlockNumber,
      archiveNode: snapshotRpc.status.fullArchiveNode,
      multicall: snapshotRpc.status.multicall,
    };
  }

  const tested = network.rpcStatus?.filter(
    (rpc: any) => !rpc.status.isIdle && !rpc.status.isLoading
  );
  if (tested) {
    result.rpcs = tested.map((rpc: any) => ({
      url: typeof rpc.url === 'object' ? rpc.url.url : rpc.url,
      latestBlock: rpc.status.latestBlockNumber,
      archiveNode: rpc.status.fullArchiveNode,
      multicall: rpc.status.multicall,
      nodeLimit: rpc.status.nodeLimit,
    }));
  }

  if (testSummary.value) {
    result.summary = {
      working: testSummary.value.working,
      total: testSummary.value.total,
      bestMs: testSummary.value.bestMs,
      avgMs: testSummary.value.avgMs,
    };
  }

  copy(JSON.stringify(result, null, 2));

  toast.success('Results copied as JSON');
}

function latencyTrend(rpcUrl: string | Record<string, any>): 'improved' | 'degraded' | 'stable' | null {
  const networkKey = app.value.selectedNetwork?.key;
  if (!networkKey) return null;
  const url = typeof rpcUrl === 'object' ? rpcUrl.url : rpcUrl;
  const history = app.value.latencyHistory[networkKey]?.[url];
  if (!history || history.length < 2) return null;
  const prev = history[history.length - 2];
  const curr = history[history.length - 1];
  const threshold = prev * 0.1;
  if (curr - prev < -threshold) return 'improved';
  if (curr - prev > threshold) return 'degraded';
  return 'stable';
}

function navigateNetwork(direction: 'prev' | 'next') {
  const keys = Object.keys(app.value.networks);
  const currentKey = app.value.selectedNetwork?.key;
  if (!currentKey || keys.length === 0) return;
  const currentIndex = keys.indexOf(currentKey);
  const nextIndex = direction === 'next'
    ? (currentIndex + 1) % keys.length
    : (currentIndex - 1 + keys.length) % keys.length;

  router.push(`/${keys[nextIndex]}`);
}

function onKeydown(event: KeyboardEvent) {
  if (["INPUT", "TEXTAREA"].includes((document.activeElement?.tagName || ""))) return;

  if (event.key === "?" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    isShowingShortcuts.value = !isShowingShortcuts.value;
    return;
  }

  if (event.key === "Escape") {
    if (isShowingShortcuts.value) {
      isShowingShortcuts.value = false;
      return;
    }
    if (app.value.isEditingNetwork) {
      app.value.isEditingNetwork = false;
      return;
    }
  }

  if (event.key === "t" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    testAllRpcsAndTrack();
    return;
  }

  if (event.key === "r" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    refreshNetwork();
    return;
  }

  if (event.key === "f" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    cycleRpcFilter();
    return;
  }

  if (event.key === "j" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    exportResultsAsJson();
    return;
  }

  if (event.key === "ArrowUp" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    navigateNetwork('prev');
    return;
  }

  if (event.key === "ArrowDown" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    navigateNetwork('next');
    return;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  lastTestedTimer = setInterval(updateLastTestedLabel, 1000);
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  if (lastTestedTimer) clearInterval(lastTestedTimer);
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
              :style="{
                backgroundColor: app.selectedNetwork.snapshotRpcStatus?.status
                  ?.isLoading
                  ? 'rgba(245, 158, 11, 0.2)'
                  : app.selectedNetwork.snapshotRpcStatus?.status
                      ?.latestBlockNumber === 'NOT WORKING'
                  ? 'rgba(235, 76, 91, 0.2)'
                  : 'rgba(87, 179, 117, 0.2)',
              }"
            >
              <div
                :class="[
                  'w-2 h-2 rounded-full',
                  app.selectedNetwork.snapshotRpcStatus?.status?.isLoading
                    ? 'bg-amber-400 animate-pulse'
                    : app.selectedNetwork.snapshotRpcStatus?.status
                        ?.latestBlockNumber === 'NOT WORKING'
                    ? 'bg-skin-error'
                    : 'bg-skin-success',
                ]"
              ></div>
            </div>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 sm:gap-3">
              <h2
                class="text-lg sm:text-2xl font-bold text-skin-heading truncate"
              >
                {{ app.selectedNetwork.name }}
              </h2>
              <button
                type="button"
                @click="toggleFavorite(app.selectedNetwork.key)"
                :class="[
                  'p-1 rounded-lg transition-colors',
                  isFavorited ? 'text-yellow-400' : 'text-skin-text/40 hover:text-yellow-400',
                ]"
                :title="isFavorited ? 'Remove from favorites' : 'Add to favorites'"
              >
                <svg class="w-4 h-4 sm:w-5 sm:h-5" :fill="isFavorited ? 'currentColor' : 'none'" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
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
          <div class="relative">
            <div
              v-if="isExportDropdownOpen"
              class="fixed inset-0 z-10"
              @click="isExportDropdownOpen = false"
            />
            <button
              type="button"
              @click.stop="isExportDropdownOpen = !isExportDropdownOpen"
              class="btn-secondary text-xs sm:text-sm"
              title="Export / Copy"
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Export
              <svg
                class="w-3 h-3 ml-0.5 inline transition-transform duration-150"
                :class="isExportDropdownOpen ? 'rotate-180' : ''"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              v-if="isExportDropdownOpen"
              class="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-skin-border bg-skin-bg-alt shadow-lg overflow-hidden animate-fade-in"
            >
              <button
                @click="copyResultsAsMarkdown(); isExportDropdownOpen = false"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-skin-text hover:bg-skin-border hover:text-skin-heading transition-colors"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                Copy as Markdown
              </button>
              <button
                @click="exportResultsAsJson(); isExportDropdownOpen = false"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-skin-text hover:bg-skin-border hover:text-skin-heading transition-colors"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
                Copy as JSON
              </button>
              <button
                @click="imageCopy(); isExportDropdownOpen = false"
                class="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-skin-text hover:bg-skin-border hover:text-skin-heading transition-colors"
              >
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Copy as Image
              </button>
            </div>
          </div>
          <button
            type="button"
            @click="isShowingShortcuts = true"
            class="btn-secondary text-xs sm:text-sm px-2.5 sm:px-3 hidden sm:inline-flex"
            title="Keyboard shortcuts (?)"
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
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
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

    <!-- Health Summary Bar -->
    <div
      v-if="testSummary"
      class="glass-panel-solid overflow-hidden mb-4 sm:mb-6 animate-fade-in"
    >
      <div class="flex flex-wrap items-center gap-4 px-4 sm:px-6 py-3">
        <div class="flex items-center gap-2">
          <div class="flex gap-0.5">
            <div
              v-for="i in testSummary.total"
              :key="'bar-' + i"
              :class="[
                'w-2 h-5 rounded-sm first:rounded-l-md last:rounded-r-md transition-colors',
                i <= testSummary.working ? 'bg-skin-success' : 'bg-skin-error/60',
              ]"
            ></div>
          </div>
          <span class="text-sm font-semibold text-skin-heading">
            {{ testSummary.working }}/{{ testSummary.total }}
            <span class="text-skin-text font-normal">working</span>
          </span>
        </div>
        <div v-if="testSummary.bestMs !== null" class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-skin-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-sm text-skin-text">
            Best:
            <span :class="['font-semibold tabular-nums', testSummary.bestMs < 200 ? 'text-skin-success' : testSummary.bestMs < 500 ? 'text-skin-warning' : 'text-skin-error']">
              {{ testSummary.bestMs.toFixed(2) }} ms
            </span>
          </span>
        </div>
        <div v-if="testSummary.avgMs !== null" class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-skin-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span class="text-sm text-skin-text">
            Avg:
            <span :class="['font-semibold tabular-nums', testSummary.avgMs < 200 ? 'text-skin-success' : testSummary.avgMs < 500 ? 'text-skin-warning' : 'text-skin-error']">
              {{ testSummary.avgMs.toFixed(2) }} ms
            </span>
          </span>
        </div>
        <div v-if="snapshotRanking" class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5 text-skin-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span class="text-sm text-skin-text">
            Snapshot
            <span :class="['font-semibold tabular-nums', snapshotRanking.rank === 1 ? 'text-skin-success' : snapshotRanking.rank <= 3 ? 'text-skin-warning' : 'text-skin-error']">
              #{{ snapshotRanking.rank }}
            </span>
            <span class="text-skin-text/60">of {{ snapshotRanking.total }}</span>
          </span>
        </div>
        <div v-if="lastTestedLabel" class="flex items-center gap-1.5 ml-auto">
          <svg class="w-3.5 h-3.5 text-skin-text/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-xs text-skin-text/60 tabular-nums">{{ lastTestedLabel }}</span>
        </div>
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
                  rel="noopener noreferrer"
                  :href="
                    explorerBlockUrl(
                      app.selectedNetwork.snapshotRpcStatus.status
                        .latestBlockNumber
                    )
                  "
                  class="group/block"
                >
                  <span
                    :class="[
                      'text-lg font-bold tabular-nums group-hover/block:text-skin-link transition-colors',
                      app.selectedNetwork.snapshotRpcStatus.status
                        .latestBlockNumber === 'NOT WORKING'
                        ? 'text-skin-error'
                        : 'text-skin-heading',
                    ]"
                  >
                    {{
                      formatBlock(
                        app.selectedNetwork.snapshotRpcStatus.status
                          .latestBlockNumber
                      )
                    }}
                  </span>
                </a>
                <span
                  v-if="(blockLag(app.selectedNetwork?.snapshotRpcStatus?.status?.latestBlockNumber) ?? 0) > 0"
                  :class="['text-[10px] font-medium ml-1', blockLagClass(blockLag(app.selectedNetwork?.snapshotRpcStatus?.status?.latestBlockNumber))]"
                >
                  -{{ blockLag(app.selectedNetwork?.snapshotRpcStatus?.status?.latestBlockNumber) }}
                </span>
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
                      rel="noopener noreferrer"
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
                      rel="noopener noreferrer"
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
                    multicallColorClass(
                      app.selectedNetwork.snapshotRpcStatus.status.multicall
                    ),
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
              rel="noopener noreferrer"
              :href="
                explorerBlockUrl(
                  app.selectedNetwork.snapshotRpcStatus.status.latestBlockNumber
                )
              "
            >
              <span
                :class="[
                  'text-base font-bold tabular-nums hover:text-skin-link transition-colors block',
                  app.selectedNetwork.snapshotRpcStatus.status
                    .latestBlockNumber === 'NOT WORKING'
                    ? 'text-skin-error'
                    : 'text-skin-heading',
                ]"
                >{{
                  formatBlock(
                    app.selectedNetwork.snapshotRpcStatus.status
                      .latestBlockNumber
                  )
                }}</span
              >
            </a>
            <span
              v-if="(blockLag(app.selectedNetwork?.snapshotRpcStatus?.status?.latestBlockNumber) ?? 0) > 0"
              :class="['text-[10px] font-medium ml-1', blockLagClass(blockLag(app.selectedNetwork?.snapshotRpcStatus?.status?.latestBlockNumber))]"
            >
              -{{ blockLag(app.selectedNetwork?.snapshotRpcStatus?.status?.latestBlockNumber) }}
            </span>
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
                  rel="noopener noreferrer"
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
                  rel="noopener noreferrer"
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
                multicallColorClass(
                  app.selectedNetwork.snapshotRpcStatus.status.multicall
                ),
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
                  <div class="flex items-center gap-3">
                    <span class="inline-flex items-center gap-2">
                      <span
                        class="w-2 h-2 rounded-full bg-skin-success animate-pulse"
                      ></span>
                      {{ app.selectedNetwork.rpc.length }} Node{{
                        app.selectedNetwork.rpc.length !== 1 ? "s" : ""
                      }}
                    </span>
                    <div class="flex items-center gap-1 ml-2">
                      <button
                        v-for="opt in RPC_FILTER_OPTIONS"
                        :key="opt"
                        @click="rpcFilter = opt"
                        :class="[
                          'px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors capitalize',
                          rpcFilter === opt
                            ? 'bg-skin-primary text-skin-accent-foreground border-skin-primary'
                            : 'bg-transparent text-skin-text border-skin-border hover:border-skin-text',
                        ]"
                      >
                        {{ opt }}
                      </button>
                    </div>
                  </div>
                  <button
                    @click="testAllRpcsAndTrack()"
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
                  <button
                    @click="handleAddChainlistRpc()"
                    @mouseenter="prefetchChainlist()"
                    :disabled="app.isChainlistLoading"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors disabled:opacity-50"
                    v-tooltip="'Add a random RPC from Chainlist'"
                  >
                    <svg v-if="app.isChainlistLoading" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Chainlist
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
              <th scope="col" class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider cursor-pointer select-none hover:text-skin-heading transition-colors" @click="toggleSort('block')">
                <span class="inline-flex items-center gap-1">
                  Latest Block
                  <svg v-if="sortColumn === 'block'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </span>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider cursor-pointer select-none hover:text-skin-heading transition-colors" @click="toggleSort('archive')">
                <span class="inline-flex items-center gap-1">
                  Archive Node
                  <svg v-if="sortColumn === 'archive'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </span>
              </th>
              <th scope="col" class="px-6 py-3 text-center text-[11px] font-semibold text-skin-text uppercase tracking-wider cursor-pointer select-none hover:text-skin-heading transition-colors" @click="toggleSort('multicall')">
                <span class="inline-flex items-center gap-1">
                  Multicall Avg
                  <svg v-if="sortColumn === 'multicall'" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="sortDirection === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'" />
                  </svg>
                </span>
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
              v-for="(rpc, index) in filteredRpcStatus"
              :key="index"
              :class="[
                'transition-colors duration-150 hover:bg-skin-border animate-fade-in',
                isNotWorking(rpc.status) ? 'bg-skin-error/5' : '',
              ]"
              :style="{
                animationDelay: index * 50 + 'ms',
                animationFillMode: 'backwards',
              }"
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
                    <button
                      v-if="!rpc.status.isIdle && !rpc.status.isLoading"
                      @click="testSingleRpc(rpc.index)"
                      class="p-1 rounded-lg hover:bg-skin-border text-skin-text hover:text-skin-heading transition-colors"
                      title="Re-test"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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
                  rel="noopener noreferrer"
                  :href="explorerBlockUrl(rpc.status.latestBlockNumber)"
                  class="group/block"
                >
                  <span
                    :class="[
                      'text-lg font-bold tabular-nums group-hover/block:text-skin-link transition-colors',
                      rpc.status.latestBlockNumber === 'NOT WORKING'
                        ? 'text-skin-error'
                        : 'text-skin-heading',
                    ]"
                  >
                    {{ formatBlock(rpc.status.latestBlockNumber) }}
                  </span>
                </a>
                <span
                  v-if="(blockLag(rpc.status.latestBlockNumber) ?? 0) > 0"
                  :class="['text-[10px] font-medium ml-1', blockLagClass(blockLag(rpc.status.latestBlockNumber))]"
                >
                  -{{ blockLag(rpc.status.latestBlockNumber) }}
                </span>
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
                      rel="noopener noreferrer"
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
                      rel="noopener noreferrer"
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
                <div class="space-y-1.5">
                  <div class="flex items-center justify-center gap-1">
                    <span
                      :class="[
                        'text-lg font-bold tabular-nums',
                        multicallColorClass(rpc.status.multicall),
                      ]"
                    >
                      {{ rpc.status.multicall }}
                    </span>
                    <svg
                      v-if="latencyTrend(rpc.url) === 'improved'"
                      class="w-3 h-3 text-skin-success"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                      title="Latency improved"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                    <svg
                      v-else-if="latencyTrend(rpc.url) === 'degraded'"
                      class="w-3 h-3 text-skin-error"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"
                      title="Latency degraded"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span
                      v-else-if="latencyTrend(rpc.url) === 'stable'"
                      class="text-[10px] text-skin-text/40 font-bold"
                      title="Latency stable"
                    >=</span>
                  </div>
                  <div
                    v-if="!isNaN(parseFloat(rpc.status.multicall))"
                    class="h-1 rounded-full bg-skin-border/50 overflow-hidden"
                  >
                    <div
                      :class="['h-full rounded-full transition-all duration-500', multicallBarColor(rpc.status.multicall)]"
                      :style="{ width: multicallBarWidth(rpc.status.multicall) }"
                    ></div>
                  </div>
                </div>
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
      <div class="flex flex-col gap-2 px-1 mb-2">
        <div class="flex items-center justify-between">
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
            @click="testAllRpcsAndTrack()"
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
        <button
          @click="handleAddChainlistRpc()"
          @mouseenter="prefetchChainlist()"
          :disabled="app.isChainlistLoading"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-skin-border text-skin-heading hover:bg-skin-text/20 transition-colors disabled:opacity-50"
          v-tooltip="'Add a random RPC from Chainlist'"
        >
          <svg v-if="app.isChainlistLoading" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Chainlist
        </button>
        </div>
        <div class="flex items-center gap-1">
          <button
            v-for="opt in RPC_FILTER_OPTIONS"
            :key="'m-filter-' + opt"
            @click="rpcFilter = opt"
            :class="[
              'px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-colors capitalize',
              rpcFilter === opt
                ? 'bg-skin-primary text-skin-accent-foreground border-skin-primary'
                : 'bg-transparent text-skin-text border-skin-border',
            ]"
          >
            {{ opt }}
          </button>
        </div>
      </div>

      <div
        v-for="(rpc, index) in filteredRpcStatus"
        :key="'m-' + index"
        :class="[
          'glass-panel-solid p-4 space-y-3 animate-fade-in',
          isNotWorking(rpc.status) ? 'bg-skin-error/5' : '',
        ]"
        :style="{
          animationDelay: index * 50 + 'ms',
          animationFillMode: 'backwards',
        }"
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
            <button
              v-if="!rpc.status.isIdle && !rpc.status.isLoading"
              @click="testSingleRpc(rpc.index)"
              class="p-1.5 rounded-lg hover:bg-skin-border text-skin-text hover:text-skin-heading transition-colors"
              title="Re-test"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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
              rel="noopener noreferrer"
              :href="explorerBlockUrl(rpc.status.latestBlockNumber)"
            >
              <span
                :class="[
                  'text-base font-bold tabular-nums hover:text-skin-link transition-colors block',
                  rpc.status.latestBlockNumber === 'NOT WORKING'
                    ? 'text-skin-error'
                    : 'text-skin-heading',
                ]"
              >
                {{ formatBlock(rpc.status.latestBlockNumber) }}
              </span>
            </a>
            <span
              v-if="(blockLag(rpc.status.latestBlockNumber) ?? 0) > 0"
              :class="['text-[10px] font-medium ml-1', blockLagClass(blockLag(rpc.status.latestBlockNumber))]"
            >
              -{{ blockLag(rpc.status.latestBlockNumber) }}
            </span>
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
                  rel="noopener noreferrer"
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
                  rel="noopener noreferrer"
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
            <div class="flex items-center gap-1">
              <span
                :class="[
                  'text-base font-bold tabular-nums',
                  multicallColorClass(rpc.status.multicall),
                ]"
              >
                {{ rpc.status.multicall }}
              </span>
              <svg
                v-if="latencyTrend(rpc.url) === 'improved'"
                class="w-2.5 h-2.5 text-skin-success"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
              </svg>
              <svg
                v-else-if="latencyTrend(rpc.url) === 'degraded'"
                class="w-2.5 h-2.5 text-skin-error"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              <span
                v-else-if="latencyTrend(rpc.url) === 'stable'"
                class="text-[10px] text-skin-text/40 font-bold"
              >=</span>
            </div>
            <div
              v-if="!isNaN(parseFloat(rpc.status.multicall))"
              class="h-1 rounded-full bg-skin-border/50 overflow-hidden"
            >
              <div
                :class="['h-full rounded-full transition-all duration-500', multicallBarColor(rpc.status.multicall)]"
                :style="{ width: multicallBarWidth(rpc.status.multicall) }"
              ></div>
            </div>
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
        <button
          type="button"
          v-if="!addRpcInput"
          class="p-4 cursor-pointer group w-full text-left"
          @click="addRpcInput = true"
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
        </button>
        <div v-else class="p-4 space-y-3">
          <input
            type="text"
            class="w-full px-3 py-2.5 bg-skin-bg border border-skin-border rounded-xl text-sm text-skin-heading focus:outline-none focus:ring-1 focus:ring-skin-heading/30 focus:border-skin-text transition-all duration-200"
            v-model="newRpcUrl"
            placeholder="https://rpc.example.com"
          />
          <div class="flex items-center gap-2">
            <button @click="addRpcMobile()" class="btn-primary text-sm flex-1">
              Add
            </button>
            <button
              @click="addRpcInput = false"
              class="btn-secondary text-sm flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <Errors :rpcStatus="app.selectedNetwork?.rpcStatus ?? []" />
  <!-- Keyboard Shortcuts Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isShowingShortcuts"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        @click.self="isShowingShortcuts = false"
      >
        <div
          class="glass-panel-solid p-6 rounded-2xl w-full max-w-sm mx-4 animate-fade-in"
          @click.stop
        >
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-skin-heading">
              Keyboard Shortcuts
            </h3>
            <button
              @click="isShowingShortcuts = false"
              class="p-1 rounded-lg text-skin-text hover:text-skin-heading hover:bg-skin-border transition-colors"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Search networks</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">/</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Test all RPCs</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">t</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Refresh network</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">r</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Cycle RPC filter</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">f</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Copy as JSON</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">j</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Previous network</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">↑</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Next network</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">↓</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Show shortcuts</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">?</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-skin-text">Close / dismiss</span>
              <kbd class="px-2 py-1 text-xs font-medium text-skin-heading bg-skin-bg rounded-lg border border-skin-border">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
