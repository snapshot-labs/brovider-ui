import { ref } from "vue";

export type Toast = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

let nextId = 0;
const toasts = ref<Toast[]>([]);

export function useToast() {
  function show(
    message: string,
    type: Toast["type"] = "success",
    duration = 2500
  ) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, duration);
  }

  function success(message: string) {
    show(message, "success");
  }

  function error(message: string) {
    show(message, "error", 4000);
  }

  function info(message: string) {
    show(message, "info");
  }

  return { toasts, show, success, error, info };
}
