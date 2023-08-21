<script setup>
import getNetworkLogo from '@/helpers/getNetworkLogo';
const props = defineProps({
  network: {
    type: String,
    required: true
  }
});

const imageLoaded = ref(false);
const imageUrl = computed(() => getNetworkLogo(props.network));

const onLoad = () => {
  imageLoaded.value = true;
};
</script>

<template>
  <div class="inline-block h-12 w-12 rounded-full ring-2 ring-transparent p-1 relative">
    <img
      :class="{ invisible: !imageLoaded }"
      class="absolute top-0 left-0 h-4/5 w-4/5 rounded-full"
      :src="imageUrl"
      alt=""
      @load="onLoad"
    />
    <div v-if="!imageLoaded && imageUrl" class="bottom-2">
      <div
        class="border-y-primary animate-spin ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8 mb-4"
      ></div>
    </div>
  </div>
</template>
