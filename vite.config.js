import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { sveltePreprocess } from 'svelte-preprocess/dist/autoProcess'
import mix from 'vite-plugin-mix'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    mix({
      handler: './src/server/web-server.js',
    }),
    svelte({
      preprocess: sveltePreprocess({
        preserve: ['ld+json'],
        scss: {
          includePaths: ['src'],
          importer: [
            url => {
              // Redirects tilde-prefixed imports to node_modules
              if (/^~/.test(url)) return { file: `node_modules/${url.replace('~', '')}` }
              return null
            },
          ],
        },
      }),
    }),
  ],
})
