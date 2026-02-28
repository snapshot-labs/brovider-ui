import { computed, reactive } from "vue";
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { multicall } from "../helpers/utils";
import exampleAddresses from "../assets/addresses.json";

const ABI = [
  "function getEthBalance(address addr) view returns (uint256 balance)",
];

const RPC_TIMEOUT = 10000;

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
  isIdle?: boolean;
};

type RpcEntry = {
  url: string | { url: string; [key: string]: any };
  index: number;
  status: RpcStatus | { isIdle: boolean; isLoading: boolean };
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
});

function editNetworkButtonClick() {
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

function createProvider(url: string | Record<string, any>) {
  const connectionInfo =
    typeof url === "object"
      ? { ...url, timeout: RPC_TIMEOUT, allowGzip: true }
      : { url, timeout: RPC_TIMEOUT, allowGzip: true };
  return new StaticJsonRpcProvider(connectionInfo);
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
    errors.push("getBlockNumber Error: " + error.message);
    return {
      latestBlockNumber: "NOT WORKING",
      fullArchiveNode: "-",
      fullArchiveNodeStart: "-",
      errors,
      multicall: "-",
      nodeLimit: "-",
      isLoading: false,
    };
  }

  try {
    fullArchiveNode = await provider.getBalance(selectedNetwork.multicall, 1);
    fullArchiveNode = parseFloat(fullArchiveNode as any) >= 0 ? "Yes" : "No";
  } catch (error) {
    fullArchiveNode = "ERROR!";
    errors.push("fullArchiveNode Error: " + error.message);
  }

  try {
    fullArchiveNodeStart = await provider.getBalance(
      selectedNetwork.multicall,
      selectedNetwork.start
    );
    fullArchiveNodeStart =
      parseFloat(fullArchiveNodeStart as any) >= 0 ? "Yes" : "No";
  } catch (error) {
    fullArchiveNodeStart = "ERROR!";
    errors.push("fullArchiveNodeStart Error: " + error.message);
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
    errors.push("multicall Error: " + error.message);
  }

  return {
    latestBlockNumber,
    fullArchiveNode,
    fullArchiveNodeStart,
    errors,
    multicall: multicallResult,
    nodeLimit: multicallResult === "ERROR!" ? "-" : "idle",
    isLoading: false,
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
      errors: ["Provider Error: " + error.message],
      multicall: "-",
      nodeLimit: "-",
      isLoading: false,
    };
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
    } else {
      state.networks[state.selectedNetwork.key] = JSON.parse(
        state.newNetworkObject
      );
    }
    selectNetwork(state.selectedNetwork.key);
  } catch (error) {
    state.error = error.message;
  }
}

async function checkSnapshotRpc(selectedNetwork: NetworkConfig) {
  const snapshotUrl = `https://rpc.snapshot.org/${selectedNetwork.key}`;
  selectedNetwork.snapshotRpcStatus = {
    url: snapshotUrl,
    index: 0,
    status: { isLoading: true, isIdle: false },
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
      errors: ["Provider Error: " + error.message],
      multicall: "-",
      nodeLimit: "-",
      isLoading: false,
    };
  }
}

async function selectNetwork(networkKey: string) {
  state.selectedNetwork = null;
  state.error = false;
  state.isEditingNetwork = false;
  state.newNetworkObject = "";
  state.selectedNetwork = JSON.parse(
    JSON.stringify(state.networks[networkKey])
  );
  const selectedNetwork = state.selectedNetwork;
  selectedNetwork.rpcStatus = selectedNetwork.rpc.map((rpc, index) => ({
    url: rpc,
    index,
    status: {
      isIdle: true,
      isLoading: false,
    },
  }));

  await checkSnapshotRpc(selectedNetwork);
}

async function testSingleRpc(rpcIndex: number) {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  const rpc = selectedNetwork.rpcStatus[rpcIndex];
  if (!rpc) return;

  rpc.status = { isIdle: false, isLoading: true };

  await checkSingleRpc(rpc, selectedNetwork);
}

async function testAllRpcs() {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  for (const rpc of selectedNetwork.rpcStatus) {
    rpc.status = { isIdle: false, isLoading: true };
  }

  await Promise.allSettled(
    selectedNetwork.rpcStatus.map((rpc) => checkSingleRpc(rpc, selectedNetwork))
  );
}

async function testNodeLimit(rpcIndex: number) {
  const selectedNetwork = state.selectedNetwork;
  if (!selectedNetwork) return;

  const rpc = selectedNetwork.rpcStatus[rpcIndex];
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
    app: computed(() => state),
  };
}
