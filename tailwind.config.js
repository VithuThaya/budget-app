/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Navy-violet aurora surfaces
        ink: {
          950: '#0A0A14',
          900: '#0F1020',
          850: '#161A2E',
          800: '#1E2338',
          700: '#2A3048',
          600: '#3A4160',
        },
        accent: {
          DEFAULT: '#9D50BB',
          soft: '#B57BD6',
          ring: '#7B3FA0',
        },
        good: '#34D399',
        warn: '#F5B942',
        bad: '#FF6B7A',
        coral: '#FF8C94',
        silver: '#E0E0E0',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(157,80,187,0.4), 0 8px 30px -10px rgba(157,80,187,0.5)',
        'glow-lg': '0 0 0 1px rgba(157,80,187,0.35), 0 16px 48px -16px rgba(157,80,187,0.55)',
        float: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 40px -20px rgba(10,10,20,0.7)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      backgroundImage: {
        aurora:
          'radial-gradient(60% 50% at 15% 0%, rgba(157,80,187,0.35) 0%, rgba(157,80,187,0) 60%), radial-gradient(50% 45% at 90% 15%, rgba(43,58,138,0.4) 0%, rgba(43,58,138,0) 60%), radial-gradient(55% 50% at 50% 100%, rgba(94,58,143,0.3) 0%, rgba(94,58,143,0) 60%)',
      },
    },
  },
  plugins: [],
}
