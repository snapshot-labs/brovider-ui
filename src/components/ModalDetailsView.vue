<script setup>
import { TransitionRoot, Dialog, TransitionChild, DialogPanel, DialogTitle } from '@headlessui/vue';
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  node: {
    type: Object
  }
});
const emit = defineEmits(['update:modelValue']);

const detailsList = computed(() => {
  return Object.entries(props.node).map(([key, value]) => {
    if (key === 'archive') {
      switch (value) {
        case 1:
          value = 'archive';
          break;
        case 0:
          value = 'light';
          break;
        default:
          value = 'n/a';
      }
    }

    if (key === 'created') {
      value = new Date(value * 1000).toLocaleString();
    }

    if (key === 'multicall') {
      value = value ?? 'n/a';
    }
    return {
      key,
      value
    };
  });
});

function setIsOpen(value) {
  emit('update:modelValue', value);
}
</script>

<template>
  <TransitionRoot appear :show="modelValue" as="template">
    <Dialog as="div" class="relative z-10" @close="setIsOpen(false)">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all"
            >
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 text-center">
                Node details
              </DialogTitle>

              <div class="my-6">
                <div class="props-list text-sm text-gray-500 text-center">
                  <div
                    v-for="(listItem, key) in detailsList"
                    :key="key"
                    class="flex justify-between py-2 border-t last:border-b"
                  >
                    <div class="font-semibold">{{ listItem.key }}</div>
                    <div
                      class="max-w-[80%] overflow-hidden overflow-ellipsis whitespace-nowrap pl-1 text-primary"
                    >
                      {{ listItem.value }}
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex w-full justify-center">
                <button
                  type="button"
                  class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium hover:text-white hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  @click="setIsOpen(false)"
                >
                  Done
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
