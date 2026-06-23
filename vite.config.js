import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages repo name so asset URLs resolve on
// https://<user>.github.io/budget-app/
export default defineConfig({
  plugins: [react()],
  base: '/budget-app/',
})
