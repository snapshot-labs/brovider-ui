import { createSharedComposable, createFetch } from '@vueuse/core';
import groupBy from 'lodash.groupby';

type Node = {
  url: string;
  network: string;
  archive: boolean;
  requests: number;
  errors: number;
  duration: number;
  multicall: string;
  provider: string;
  created: number;
};

const useApiFetch = createFetch({
  baseUrl: import.meta.env.VITE_BROVIDER_URL as string,
  fetchOptions: {
    headers: {
      'Content-Type': 'application/json'
    }
  }
});

function useFetchNodes() {
  const nodes = ref([]) as Ref<Node[]>;
  const error = ref(null) as Ref<any | null>;
  const networks = computed(() => {
    const grouped = groupBy(nodes.value, 'network');
    return Object.keys(grouped).filter(key => Number(key) >= 0);
  });

  async function fetchNodes() {
    const { data, error: err } = await useApiFetch('/api/nodes').json<{ nodes: Node[] }>();
    if (err.value) {
      error.value = err.value || 'Unknown error';
      return;
    }
    const fetchedNodes = data.value?.nodes || [];
    nodes.value = fetchedNodes;
  }

  async function addNodes(nodes: Node[]) {
    const { data, error: err } = await useApiFetch('/api/nodes', {
      method: 'POST',
      body: JSON.stringify({ nodes })
    });

    if (err.value) {
      error.value = err.value || 'Unknown error';
      return;
    }
    const { status, nodeIds } = data.value as { status: string; nodeIds: string[] };
    if (status !== 'ok') {
      error.value = 'Unknown error';
      return;
    }
    return nodeIds;
  }

  async function editNode(node: Node) {
    const { data, error: err } = await useApiFetch('/api/nodes', {
      method: 'PUT',
      body: JSON.stringify({ node })
    });
    if (err.value) {
      error.value = err.value || 'Unknown error';
      return;
    }
    const { status } = data.value as { status: string };
    if (status !== 'ok') {
      error.value = 'Unknown error';
      return;
    }
  }

  async function deleteNode(nodeUrl: string) {
    const { data, error: err } = await useApiFetch('/api/nodes', {
      method: 'DELETE',
      body: JSON.stringify({ nodeUrl })
    });
    if (err.value) {
      error.value = err.value || 'Unknown error';
      return;
    }
    const { status } = data.value as { status: string };
    if (status !== 'ok') {
      error.value = 'Unknown error';
      return;
    }
  }

  async function processNodes() {
    const { data, error: err } = await useApiFetch('/api/process', {
      method: 'POST'
    });
    if (err.value) {
      error.value = err.value || 'Unknown error';
      return;
    }
    const { status } = data.value as { status: string };
    if (status !== 'ok') {
      error.value = 'Unknown error';
      return;
    }
  }

  function nodesForNetwork(network: string) {
    return nodes.value.filter(node => {
      if (network === '0') {
        return node.network === network || node.network === '-1';
      }
      return node.network === network;
    });
  }

  return {
    nodes,
    error,
    networks,
    nodesForNetwork,
    fetchNodes,
    addNodes,
    editNode,
    deleteNode,
    processNodes
  };
}

export default createSharedComposable(useFetchNodes);
