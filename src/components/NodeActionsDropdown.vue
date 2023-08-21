<script setup>
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';
const props = defineProps({
  item: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['view', 'edit', 'remove']);

const buttons = [
  {
    label: 'View',
    action: () => emit('view', props.item)
  },
  {
    label: 'Edit',
    action: () => emit('edit', props.item)
  },
  {
    label: 'Remove',
    action: () => emit('remove', props.item)
  }
];
</script>

<template>
  <Menu as="div">
    <MenuButton class="align-middle" @click.stop>
      <IH-ellipsis-vertical class="w-5 h-5 text-gray-500"></IH-ellipsis-vertical>
    </MenuButton>
    <MenuItems class="absolute right-10 z-10 bg-white flex flex-col border rounded">
      <MenuItem v-for="(button, index) in buttons" :key="index" v-slot="{ active }">
        <button class="py-2 px-4" :class="{ 'bg-primary': active }" @click.stop="button.action">
          {{ button.label }}
        </button>
      </MenuItem>
    </MenuItems>
  </Menu>
</template>
