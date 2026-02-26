import { createRouter, createWebHashHistory } from "vue-router";
import NetworkTester from "../components/NetworkTester.vue";
import SelectNetworkMessage from "../components/SelectNetworkMessage.vue";

const routes = [
  {
    path: "/",
    component: SelectNetworkMessage,
  },
  {
    path: "/:id",
    component: NetworkTester,
  },
  {
    path: "/:catchAll(.*)",
    component: SelectNetworkMessage,
  },
];
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
