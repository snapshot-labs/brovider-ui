import { createApp } from 'vue'
import FloatingVue from 'floating-vue'
import App from './App.vue'
import router from './router'
import 'floating-vue/dist/style.css'
import './index.css'

createApp(App).use(router).use(FloatingVue, {
  themes: {
    tooltip: {
      delay: { show: 300, hide: 0 },
    },
  },
}).mount('#app')
