// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  // Fully client-side app: all persistence (File System Access API,
  // sql.js) only exists in the browser, so there is nothing useful
  // to render on a server.
  ssr: false,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  vite: {
    build: {
      // Collapse everything (including the sql.js wasm binary) into a
      // single chunk with no code-splitting: scripts/pack-offline.mjs
      // then inlines that chunk directly into index.html, since Chrome
      // refuses ES module `src=` fetches and any fetch() of local files
      // from file:// pages.
      cssCodeSplit: false,
      assetsInlineLimit: Number.MAX_SAFE_INTEGER,
      rollupOptions: {
        output: {
          inlineDynamicImports: true
        }
      }
    }
  }
})
