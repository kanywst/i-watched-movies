/// <reference types="vitest" />
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Inline public/collection.jsonld into <head> as <script type="application/ld+json">
// so crawlers and AI agents (which don't run JS) still see the structured data.
const inlineJsonLd = (): Plugin => ({
  name: 'inline-jsonld',
  transformIndexHtml(html) {
    const file = join(process.cwd(), 'public/collection.jsonld')
    if (!existsSync(file)) return html
    const jsonld = readFileSync(file, 'utf-8')
    return html.replace(
      '</head>',
      `<script type="application/ld+json">${jsonld}</script>\n</head>`,
    )
  },
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), inlineJsonLd()],
  base: './', // Use relative base for easier deployment on GH Pages subdirectories
  build: {
    rollupOptions: {
      output: {
        // The diary is a content repo: `main` takes a commit every time a movie issue is
        // filed, and each one rewrites movies.json. Bundled together with React and the app
        // code, that invalidated the single entry chunk on every content push, so returning
        // visitors re-downloaded React to find out that one film had been added. Split along
        // the lines things actually change on: react almost never, the app on a code change,
        // the data on every entry.
        manualChunks(id) {
          if (id.includes('src/data/movies.json')) return 'movies-data'
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
