import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import AddNetworks from '@/views/AddNetworks.vue';
import Network from '@/views/Network.vue';

const routes: any[] = [
  {
    path: '/',
    name: 'home',
    component: Home,
    children: [
      { path: '', name: 'add', component: AddNetworks },
      { path: '/:id', name: 'network', component: Network }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

export default router;
