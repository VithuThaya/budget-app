import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Content-Security-Policy injected only into the production build. It limits where
// the app may load code/data from, so a stray injection can't exfiltrate to an
// attacker domain. connect-src allows only Supabase (REST + Realtime websocket);
// fonts come from Google Fonts; 'unsafe-inline' on style-src is required by
// Recharts/React inline styles. It is NOT applied in dev because Vite's HMR relies
// on inline scripts that a strict script-src would block.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // Supabase REST + Realtime websocket; Google Fonts is fetched by html-to-image
  // to embed the webfont into the exported Monthly Story PNG.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
    )
  },
}

// base must match the GitHub Pages repo name so asset URLs resolve on
// https://<user>.github.io/budget-app/
export default defineConfig({
  plugins: [react(), cspPlugin],
  base: '/budget-app/',
  build: {
    // Drop Vite's inline modulepreload polyfill so the build contains no inline
    // <script>, keeping the CSP strict (script-src 'self', no 'unsafe-inline').
    // Native modulepreload is supported by all current browsers.
    modulePreload: { polyfill: false },
  },
})
