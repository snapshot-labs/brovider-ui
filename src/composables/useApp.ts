import { computed, reactive } from "vue";
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { multicall } from "../helpers/utils";
import exampleAddresses from "../assets/addresses.json";

const ABI = [
  "function getEthBalance(address addr) view returns (uint256 balance)",
];

const RPC_TIMEOUT = 10000;

const CHAINLIST_URL = 'https://chainlist.org/rpcs.json';

type SnapshotNetwork = {
  id: string;
  name: string;
  premium: boolean;
  spacesCount: number;
};

type RpcStatus = {
  latestBlockNumber: number | string;
  fullArchiveNode: string;
  fullArchiveNodeStart: string;
  errors: string[];
  multicall: string;
  nodeLimit: string;
  isLoading: boolean;
  isIdle: boolean;
};

type RpcEntry = {
  url: string | Record<string, any>;
  index: number;
  status: RpcStatus;
};

type NetworkConfig = {
  key: string;
  name: string;
  shortName: string;
  chainId: number;
  network: string;
  multicall: string;
  rpc: (string | Record<string, any>)[];
  explorer: { url: string };
  start: number;
  logo: string;
  testnet?: boolean;
  rpcStatus?: RpcEntry[];
  snapshotRpcStatus?: RpcEntry;
};

let chainlistFetchPromise: Promise<any[]> | null = null;

function fetchChainlist(): Promise<any[]> {
  if (state.chainlistCache) return Promise.resolve(state.chainlistCache);
  if (chainlistFetchPromise) return chainlistFetchPromise;

  chainlistFetchPromise = fetch(CHAINLIST_URL)
    .then(r => r.json())
    .then((data: any[]) => {
      state.chainlistCache = data;
      chainlistFetchPromise = null;
      return data;
    })
    .catch((error) => {
      chainlistFetchPromise = null;
      throw error;
    });

  return chainlistFetchPromise;
}

const state = reactive({
  selectedNetwork: null as NetworkConfig | null,
  isEditingNetwork: false,
  editNetworkType: "",
  error: false as boolean | string,
  newNetworkObject: "",
  networks: {} as Record<string, any>,
  isLoading: true,
  snapshotNetworks: {} as Record<string, SnapshotNetwork>,
  areSnapshotNetworksLoaded: false,
  networkHealthMap: {} as Record<string, "healthy" | "degraded" | "down">,
  favoriteNetworks: JSON.parse(localStorage.getItem('brovider-favorites') || '{}') as Record<string, boolean>,
  latencyHistory: {} as Record<string, Record<string, number[]>>,
  chainlistCache: null as any[] | null,
  isChainlistLoading: false,
});

function editNetworkButtonClick() {
  if (!state.selectedNetwork) return;
  state.isEditingNetwork = true;
  state.editNetworkType = "selected";
  state.newNetworkObject = JSON.stringify(
    state.networks[state.selectedNetwork.key],
    null,
    2
  );
}

function editNetworksJSONButtonClick() {
  state.isEditingNetwork = true;
  state.editNetworkType = "full";
  state.newNetworkObject = JSON.stringify(state.networks, null, 2);
}

function toggleFavorite(key: string) {
  if (state.favoriteNetworks[key]) {
    delete state.favoriteNetworks[key];
  } else {
    state.favoriteNetworks[key] = true;
  }
  localStorage.setItem('brovider-favorites', JSON.stringify(state.favoriteNetworks));
}

function recordLatency(networkKey: string, rpcUrl: string, multicallMs: number) {
  if (!state.latencyHistory[networkKey]) {
    state.latencyHistory[networkKey] = {};
  }
  if (!state.latencyHistory[networkKey][rpcUrl]) {
    state.latencyHistory[networkKey][rpcUrl] = [];
  }
  state.latencyHistory[networkKey][rpcUrl].push(multicallMs);
  if (state.latencyHistory[networkKey][rpcUrl].length > 10) {
    state.latencyHistory[networkKey][rpcUrl].shift();
  }
}

function createProvider(url: string | Record<string, any>) {
  const connectionInfo: Record<string, any> =
    typeof url === "object"
      ? { ...url, timeout: RPC_TIMEOUT, allowGzip: true }
      : { url, timeout: RPC_TIMEOUT, allowGzip: true };
  return new StaticJsonRpcProvider(connectionInfo as any);
}

async function checkRpcCore(
  provider: StaticJsonRpcProvider,
  selectedNetwork: NetworkConfig
): Promise<RpcStatus> {
  let latestBlockNumber: number | string = "...";
  let fullArchiveNode = "...";
  let fullArchiveNodeStart = "...";
  let multicallResult = "...";
  const errors: string[] = [];

  try {
    latestBlockNumber = await provider.getBlockNumber();
  } catch (error) {
    errors.push("getBlockNumber Error: " + (error as Error).message);
    return {
      latestBlockNumber: "NOT WORKING",
      fullArchiveNode: "-",
      fullArchiveNodeStart: "-",
      errors,
      multicall: "-",
      nodeLimit: "-",
      isLoading: false,
      isIdle: false,
    };
  }

  try {
    fullArchiveNode = (await provider.getBalance(selectedNetwork.multicall, 1)) as any;
    fullArchiveNode = parseFloat(fullArchiveNode as any) >= 0 ? "Yes" : "No";
  } catch (error) {
    fullArchiveNode = "ERROR!";
    errors.push("fullArchiveNode Error: " + (error as Error).message);
  }

  try {
    fullArchiveNodeStart = (await provider.getBalance(
      selectedNetwork.multicall,
      selectedNetwork.start
    )) as any;
    fullArchiveNodeStart =
      parseFloat(fullArchiveNodeStart as any) >= 0 ? "Yes" : "No";
  } catch (error) {
    fullArchiveNodeStart = "ERROR!";
    errors.push("fullArchiveNodeStart Error: " + (error as Error).message);
  }

  try {
    const addresses = [selectedNetwork.multicall];
    let multicallAvgTime = 0;
    for (let i = 0; i < 3; i++) {
      const start = performance.now();

      await multicall(
        state.networks[selectedNetwork.key],
        provider,
        ABI,
        addresses.map((address) => [
          selectedNetwork.multicall,
          "getEthBalance",
          [address],
        ]),
        { blockTag: "latest" }
      );
      multicallAvgTime += performance.now() - start;
    }
    multicallResult = (multicallAvgTime / 3).toFixed(2) + " ms";
  } catch (error) {
    multicallResult = "ERROR!";
    errors.push("multicall Error: " + (error as Error).message);
  }

  return {
    latestBlockNumber,
    fullArchiveNode,
    fullArchiveNodeStart,
    errors,
    multicall: multicallResult,
    nodeLimit: multicallResult === "ERROR!" ? "-" : "idle",
    isLoading: false,
    isIdle: false,
  };
}

async function checkSingleRpc(rpc: RpcEntry, selectedNetwork: NetworkConfig) {
  if (selectedNetwork.chainId !== state.selectedNetwork?.chainId) return;

  try {
    const provider = createProvider(rpc.url);

    rpc.status = await checkRpcCore(provider, selectedNetwork);
  } catch (error) {
    rpc.status = {
      latestBlockNumber: "NOT WORKING",
      fullArchiveNode: "-",
      fullArchiveNodeStart: "-",
      errors: ["Provider Error: " + (error as Error).message],
      multicall: "-",
      nodeLimit: "-",
      isLoading: false,
      isIdle: false,
    };
  }

  const ms = parseFloat((rpc.status as RpcStatus).multicall);
  if (!isNaN(ms)) {
    const url = typeof rpc.url === 'object' ? rpc.url.url : rpc.url;

    recordLatency(selectedNetwork.key, url, ms);
  }
}

async function checkNodeLimitForRpc(
  rpc: RpcEntry,
  selectedNetwork: NetworkConfig
) {
  if (selectedNetwork.chainId !== state.selectedNetwork?.chainId) return;
  const status = rpc.status as RpcStatus;
  if (
    status.multicall === "ERROR!" ||
    status.latestBlockNumber === "NOT WORKING"
  )
    return;

  const provider = createProvider(rpc.url);

  let upperLimit = 10000;
  let lowerLimit = 0;
  let nodeLimit = 0;
  for (let attempt = 0; attempt < 20; attempt++) {
    if (selectedNetwork.chainId !== state.selectedNetwork?.chainId) break;
    const checkWith = Math.ceil((upperLimit + lowerLimit) / 2);
    status.nodeLimit = "checking with " + checkWith + " addresses";
    try {
      const response = await multicall(
        state.networks[selectedNetwork.key],
        provider,
        ABI,
        exampleAddresses
          .slice(0, checkWith)
          .map((address) => [
            selectedNetwork.multicall,
            "getEthBalance",
            [address],
          ]),
        { blockTag: "latest" }
      );
      if (response.length === checkWith) {
        if (response.length === 10000 || upperLimit - lowerLimit <= 100) {
          nodeLimit = response.length;
          break;
        }
        lowerLimit = checkWith;
      } else {
        nodeLimit = response.length;
        break;
      }
    } catch (error) {
      upperLimit = checkWith;
    }
  }
  status.nodeLimit = "~" + nodeLimit;
}

function changeNetworksObject() {
  try {
    if (state.editNetworkType === "full") {
      state.networks = JSON.parse(state.newNetworkObject);
    } else if (state.selectedNetwork) {
      state.networks[state.selectedNetwork.key] = JSON.parse(
        state.newNetworkObject
      );
    }
    if (state.selectedNetwork) {
      selectNetwork(state.selectedNetwork.key);
    }
  } catch (error) {
    state.error = (error as Error).message;
  }
}

async function checkSnapshotRpc(selectedNetwork: NetworkConfig) {
  const snapshotUrl = `https://rpc.snapshot.org/${selectedNetwork.key}`;
  selectedNetwork.snapshotRpcStatus = {
    url: snapshotUrl,
    index: 0,
    status: { isLoading: true, isIdle: false } as RpcStatus,
  };

  try {
    const provider = createProvider(snapshotUrl);

    selectedNetwork.snapshotRpcStatus.status = await checkRpcCore(
      provider,
      selectedNetwork
    );
  } catch (error) {
    selectedNetwork.snapshotRpcStatus.status = {
      latestBlockNumber: "NOT WORKING",
      fullArchiveNode: "-",
      fullArchiveNodeStart: "-",
      errors: ["Provider Error: " + (error as Error).message],
      multicall: "-",
      nodeLimit: "-",
      isLoading: false,
      isIdle: false,
    };
  }

  const status = selectedNetwork.snapshotRpcStatus.status as RpcStatus;
  if (status.latestBlockNumber === "NOT WORKING") {
    state.networkHealthMap[selectedNetwork.key] = "down";
  } else if (status.multicall === "ERROR!" || status.fullArchiveNode !== "Yes") {
    state.networkHealthMap[selectedNetwork.key] = "degraded";
  } else {
    state.networkHealthMap[selectedNetwork.key] = "healthy";
  }

  const ms = parseFloat(status.multicall);
  if (!isNaN(ms)) {
    recordLatency(selectedNetwork.key, snapshotUrl, ms);
  }
}

function addRpcToNetwork(rpcUrl: string | Record<string, any>) {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  state.networks[selectedNetwork.key].rpc.push(rpcUrl);

  const newIndex = selectedNetwork.rpcStatus?.length ?? 0;
  selectedNetwork.rpc.push(rpcUrl);
  selectedNetwork.rpcStatus = [
    ...(selectedNetwork.rpcStatus || []),
    {
      url: rpcUrl,
      index: newIndex,
      status: { isIdle: true, isLoading: false } as RpcStatus,
    },
  ];
}

async function selectNetwork(networkKey: string) {
  state.selectedNetwork = null;
  state.error = false;
  state.isEditingNetwork = false;
  state.newNetworkObject = "";
  state.selectedNetwork = JSON.parse(
    JSON.stringify(state.networks[networkKey])
  );
  const selectedNetwork = state.selectedNetwork as NetworkConfig;
  selectedNetwork.rpcStatus = selectedNetwork.rpc.map((rpc, index) => ({
    url: rpc,
    index,
    status: { isIdle: true, isLoading: false } as RpcStatus,
  }));

  await checkSnapshotRpc(selectedNetwork);
}

async function testSingleRpc(rpcIndex: number) {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  const rpc = selectedNetwork.rpcStatus?.[rpcIndex];
  if (!rpc) return;

  rpc.status = { isIdle: false, isLoading: true } as RpcStatus;

  await checkSingleRpc(rpc, selectedNetwork);
}

async function testAllRpcs() {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  for (const rpc of selectedNetwork.rpcStatus ?? []) {
    rpc.status = { isIdle: false, isLoading: true } as RpcStatus;
  }

  await Promise.allSettled(
    (selectedNetwork.rpcStatus ?? []).map((rpc) => checkSingleRpc(rpc, selectedNetwork))
  );
}

async function testNodeLimit(rpcIndex: number) {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  const rpc = selectedNetwork.rpcStatus?.[rpcIndex];
  if (!rpc) return;

  (rpc.status as RpcStatus).nodeLimit = "checking...";

  await checkNodeLimitForRpc(rpc, selectedNetwork);
}

async function testSnapshotNodeLimit() {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork?.snapshotRpcStatus) return;

  (selectedNetwork.snapshotRpcStatus.status as RpcStatus).nodeLimit =
    "checking...";

  await checkNodeLimitForRpc(
    selectedNetwork.snapshotRpcStatus,
    selectedNetwork
  );
}

export function useApp() {
  async function init() {
    await getData();
    state.isLoading = false;
  }

  async function getData() {
    const hubQuery = JSON.stringify({
      query: "{ networks { id name premium spacesCount } }",
    });
    const hubHeaders = { "Content-Type": "application/json" };

    const [networksObj, mainnetData, testnetData]: any = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/snapshot-labs/snapshot.js/master/src/networks.json"
      ).then((res) => res.json()),
      fetch("https://hub.snapshot.org/graphql", {
        method: "POST",
        headers: hubHeaders,
        body: hubQuery,
      })
        .then((res) => res.json())
        .then((res) => res?.data?.networks || [])
        .catch(() => []),
      fetch("https://testnet.hub.snapshot.org/graphql", {
        method: "POST",
        headers: hubHeaders,
        body: hubQuery,
      })
        .then((res) => res.json())
        .then((res) => res?.data?.networks || [])
        .catch(() => []),
    ]);

    const snapshotMap: Record<string, SnapshotNetwork> = {};
    for (const network of mainnetData) {
      snapshotMap[network.id] = network;
    }
    for (const network of testnetData) {
      if (!snapshotMap[network.id]) {
        snapshotMap[network.id] = network;
      }
    }
    state.snapshotNetworks = snapshotMap;
    state.areSnapshotNetworksLoaded = true;

    for (const key of Object.keys(networksObj)) {
      if (!networksObj[key])
        networksObj[key] = {
          key,
          name: key,
          shortName: key,
          chainId: Number(key),
          network: key,
          multicall: "",
          rpc: [],
          explorer: {
            url: "",
          },
          start: 0,
          logo: "",
        };
    }
    state.networks = networksObj;
  }

  async function getChainIdFromRpc(rpcUrl: string): Promise<string | null> {
    try {
      const provider = new StaticJsonRpcProvider({
        url: rpcUrl,
        timeout: 15000,
        allowGzip: true,
      });
      const network = await provider.getNetwork();
      return network.chainId.toString();
    } catch (error) {
      return null;
    }
  }
  function prefetchChainlist() {
    if (!state.chainlistCache && !chainlistFetchPromise) {
      fetchChainlist();
    }
  }

  async function addChainlistRpc(): Promise<{ added: string | null; remaining: number }> {
    const selectedNetwork = state.selectedNetwork;
    if (!selectedNetwork) return { added: null, remaining: 0 };

    if (!state.chainlistCache) {
      state.isChainlistLoading = true;
      try {
        await fetchChainlist();
      } catch (error) {
        state.isChainlistLoading = false;
        throw new Error('Failed to fetch chainlist data');
      }
      state.isChainlistLoading = false;
    }

    const chainData = state.chainlistCache!.find(
      (c: any) => c.chainId?.toString() === selectedNetwork.key
    );
    if (!chainData?.rpc?.length) return { added: null, remaining: 0 };

    const httpRpcs: string[] = chainData.rpc
      .map((r: any) => (typeof r === 'string' ? r : r.url))
      .filter((url: string) => url?.startsWith('http'));

    const existingUrls = new Set(
      selectedNetwork.rpc.map((r: any) => (typeof r === 'object' ? r.url : r))
    );

    const available = httpRpcs.filter((url: string) => !existingUrls.has(url));
    if (available.length === 0) return { added: null, remaining: 0 };

    const randomUrl = available[Math.floor(Math.random() * available.length)];

    addRpcToNetwork(randomUrl);

    return { added: randomUrl, remaining: available.length - 1 };
  }
  return {
    init,
    selectNetwork,
    testSingleRpc,
    testAllRpcs,
    testNodeLimit,
    testSnapshotNodeLimit,
    editNetworkButtonClick,
    editNetworksJSONButtonClick,
    changeNetworksObject,
    getChainIdFromRpc,
    toggleFavorite,
    addChainlistRpc,
    prefetchChainlist,
    addRpcToNetwork,
    app: computed(() => state),
  };
}
