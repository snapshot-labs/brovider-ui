<script setup>
const { processNodes, addNodes } = useFetchNodes();

const items = ref([]);

const newItem = ref({
  url: '',
  provider: '',
  multicall: ''
});

const removeItem = index => {
  items.value.splice(index, 1);
};

const addItem = () => {
  if (newItem.value.url) {
    items.value.push({
      url: newItem.value.url,
      provider: newItem.value.provider,
      multicall: newItem.value.multicall
    });
    newItem.value = {
      url: '',
      provider: '',
      multicall: ''
    };
  }
};

async function addNewNodes() {
  try {
    await addNodes(items.value);
    items.value = [];
  } catch (e) {
    console.log(e);
  }
}
</script>

<template>
  <div class="max-h-[95vh] overflow-y-scroll">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-semibold">Networks</h1>
      <button
        class="items-center px-4 py-2 mx-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-transparent"
        @click="processNodes()"
      >
        Process nodes
      </button>
    </div>
    <ul>
      <li
        v-for="(item, index) in items"
        :key="index"
        class="flex items-stretch justify-between mb-2"
      >
        <div class="flex grow shadow mr-2 border-gray-200 sm:rounded-lg">
          <div class="p-2 flex w-[45%] border-r">
            <div class="font-semibold pr-2">url:</div>
            <div class="line-clamp-1">{{ item.url }}</div>
          </div>
          <div class="p-2 flex w-[30%] border-r">
            <div class="font-semibold pr-2">provider:</div>
            <div class="line-clamp-1">{{ item.provider }}</div>
          </div>
          <div class="p-2 flex w-[25%]">
            <div class="font-semibold pr-2">multicall:</div>
            <div class="line-clamp-1">{{ item.multicall }}</div>
          </div>
        </div>
        <button
          class="rounded-full text-gray-600 w-10 h-10 min-w-[2.5rem] flex items-center justify-center shadow border-gray-200 sm:rounded-lg"
          @click="removeItem(index)"
        >
          <IH-minus-circle class="w-[60%] h-[60%]" />
        </button>
      </li>
    </ul>
    <div class="flex items-stratch justify-between mb-2">
      <div class="flex grow shadow mr-2 border-gray-200 sm:rounded-lg">
        <input v-model="newItem.url" placeholder="URL" class="border w-[45%] p-2 mr-2" required />
        <input v-model="newItem.provider" placeholder="Provider" class="border p-2 w-[30%] mr-2" />
        <input
          v-model="newItem.multicall"
          placeholder="Multicall"
          class="border p-2 w-[25%] last:mr-0"
        />
      </div>
      <button
        class="rounded-full text-gray-600 min-w-[2.5rem] w-10 h-10 flex items-center justify-center shadow border-gray-200 sm:rounded-lg"
        @click="addItem()"
      >
        <IH-plus-circle class="w-[60%] h-[60%]" />
      </button>
    </div>
    <div class="flex bg-white bottom-0">
      <button
        class="items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-transparent disabled:opacity-50 disabled:hover:bg-white"
        :disabled="!items.length"
        @click="addNewNodes()"
      >
        Add nodes
      </button>
    </div>
  </div>
</template>
