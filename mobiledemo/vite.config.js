import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// The Companion demo is served by MkDocs at /mobiledemo/ (and on GitHub Pages
// under a project subpath), so assets must be referenced relatively — never
// from an absolute root. `base: './'` makes the bundle self-contained
// wherever it is mounted. Same contract as app/vite.config.js.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // MkDocs picks this up as a static page at docs/mobiledemo/index.html
    // (see .github/workflows/deploy.yml).
    outDir: fileURLToPath(new URL('../docs/mobiledemo', import.meta.url)),
    emptyOutDir: true,
  },
})
