<script setup>
import getNetworkName from '@/helpers/getNetworkName';
const { networks = [], fetchNodes } = useFetchNodes();
onMounted(fetchNodes);
</script>

<template>
  <div class="flex font-sans bg-white">
    <div class="relative inline-block text-left w-60 shadow-md overflow-y-scroll h-screen">
      <div class="sticky top-0 z-10 bg-white">
        <div class="py-5 flex justify-center border-b">
          <router-link to="/">
            <img
              class="inline w-6"
              src="https://raw.githubusercontent.com/snapshot-labs/brand/master/icon/icon.svg"
            />
            <h2
              class="inline text-xl tracking-tight font-semi-bold text-gray-900 ml-2 align-middle"
            >
              Networks
            </h2>
          </router-link>
        </div>
      </div>
      <ul>
        <li v-for="(networkId, index) in Object.values(networks)" :key="index" class="relative">
          <router-link :to="{ name: 'network', params: { id: networkId } }">
            <div
              :class="`flex hover:bg-purple-500 hover:text-white p-2 pl-2 border-b ${
                $route.params.id === networkId ? ' bg-purple-700 text-white' : 'text-gray-700'
              }`"
            >
              <div>
                <span
                  class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"
                >
                  {{ networkId }}
                </span>
              </div>
              <div id="menu-item-0" class="px-2 py-1 text-sm" role="menuitem" tabindex="-1">
                {{ getNetworkName(networkId) }}
              </div>
            </div>
          </router-link>
        </li>
      </ul>
    </div>
    <div class="flex-auto p-4">
      <router-view />
    </div>
  </div>
</template>
