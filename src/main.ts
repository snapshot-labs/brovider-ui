import App from '@/App.vue';
import router from '@/router';
import '@/style.scss';

const app = createApp({ render: () => h(App) })
  .use(router)
  .mount('#app');

export default app;
