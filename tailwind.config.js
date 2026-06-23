/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Dark finance surfaces (zinc-based)
        ink: {
          950: '#09090b',
          900: '#0f0f12',
          850: '#161619',
          800: '#1c1c20',
          700: '#27272a',
          600: '#3f3f46',
        },
        accent: {
          DEFAULT: '#2563eb',
          soft: '#3b82f6',
          ring: '#1d4ed8',
        },
        good: '#22c55e',
        warn: '#f59e0b',
        bad: '#ef4444',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(37,99,235,0.4), 0 8px 30px -10px rgba(37,99,235,0.45)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
}
