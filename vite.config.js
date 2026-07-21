import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: `base` must match the repository name exactly, with slashes.
// Site will be served at https://uofthcdslab.github.io/ambiguity-sandbox/
// If you rename the repo, change this line.
export default defineConfig({
  base: '/ambiguard/',
  plugins: [react()],
})
