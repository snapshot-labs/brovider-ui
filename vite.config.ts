import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import visualizer from 'rollup-plugin-visualizer';
import inject from '@rollup/plugin-inject';

const ELECTRON = process.env.ELECTRON || false;

const target = ['esnext'];

export default defineConfig({
  base: ELECTRON ? path.resolve(__dirname, './dist') : undefined,
  define: {
    'process.env': process.env
  },
  plugins: [
    vue({ reactivityTransform: true }),
    AutoImport({
      imports: ['vue', 'vue-router'],
      dirs: ['./src/composables'],
      eslintrc: {
        enabled: true
      }
    }),
    Components({
      directoryAsNamespace: true,
      resolvers: [
        IconsResolver({
          alias: {
            h: 'heroicons-outline',
            s: 'heroicons-solid'
          }
        })
      ]
    }),
    visualizer({
      filename: './dist/stats.html',
      template: 'sunburst',
      gzipSize: true
    }),
    Icons({
      compiler: 'vue3',
      iconCustomizer(collection, icon, props) {
        props.width = '20px';
        props.height = '20px';
      }
    })
  ],
  build: {
    target,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      plugins: [
        inject({
          Buffer: ['buffer', 'Buffer']
        })
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});
