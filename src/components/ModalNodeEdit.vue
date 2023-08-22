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
const emit = defineEmits(['update:modelValue', 'edit']);

const form = computed(() => ({
  url: props.node.url,
  network: props.node.network,
  provider: props.node.provider,
  requests: props.node.requests,
  errors: props.node.errors,
  duration: props.node.duration,
  archive: props.node.archive,
  multicall: props.node.multicall
}));

const errors = reactive({});

watch(
  () => props.modelValue,
  val => {
    if (!val) {
      Object.keys(errors).forEach(key => (errors[key] = null));
    }
  }
);

const validators = {
  url: value => (!value ? 'URL is required' : null),
  requests: value => (!isNumeric(value) ? 'Requests must be a number' : null),
  errors: value => (!isNumeric(value) ? 'Errors must be a number' : null),
  duration: value => (!isNumeric(value) ? 'Duration must be a number' : null)
};

function isDisabled(field) {
  return ['url', 'archive', 'network'].includes(field);
}

function isNumeric(stringVal) {
  return /^\d+$/.test(stringVal);
}

const validate = field => {
  const validator = validators[field];
  if (validator) {
    errors[field] = validator(form.value[field]);
  }
};

function saveChanges() {
  emit('edit', form.value);
}

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
                Edit node
              </DialogTitle>

              <div class="my-6">
                <form class="max-h-[50vh] overflow-y-scroll" @submit.prevent="saveChanges">
                  <div v-for="(value, key) in form" :key="key" class="mb-4">
                    <label :for="key" class="block text-gray-700 text-sm font-bold mb-2">{{
                      key
                    }}</label>
                    <input
                      :id="key"
                      v-model="form[key]"
                      :class="errors[key] ? 'border-red-500' : 'border-gray-200'"
                      class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      :disabled="isDisabled(key)"
                      @blur="validate(key)"
                    />
                    <p v-if="errors[key]" class="text-red-500 text-xs italic">
                      {{ errors[key] }}
                    </p>
                  </div>
                  <div class="mt-4 flex w-full justify-around">
                    <button
                      type="submit"
                      class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium hover:text-white hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      :disabled="Object.values(errors).some(error => error)"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      class="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium hover:text-white hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      @click="setIsOpen(false)"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
