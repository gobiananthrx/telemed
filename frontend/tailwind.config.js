/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E', // Primary Clinical Calm Teal
          800: '#115E59',
          900: '#134E4A',
        },
        telemed: {
          primary: '#0F766E',
          secondary: '#0284C7',
          accent: '#0D9488',
          dark: '#0D1117',
          crimson: '#E11D48',
          emerald: '#059669',
          amber: '#D97706',
          bg: '#FAF8FF',
          surface: '#F8FAFC'
        },
        slate: {
          850: '#151F32',
          950: '#0B0F17'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'teal-glow': '0 10px 25px -5px rgba(15, 118, 110, 0.25)',
        'floating': '0 12px 30px -4px rgba(15, 118, 110, 0.18)',
        'call-hud': '0 20px 40px -15px rgba(0, 0, 0, 0.6)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
