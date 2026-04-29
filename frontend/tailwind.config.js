/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body:    ['"Inter"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      colors: {
        ink: {
          900: '#0A0E1A',
          800: '#111827',
          700: '#1F2937',
          600: '#374151'
        },
        accent: {
          green: '#10B981',
          red:   '#EF4444',
          gold:  '#F59E0B',
          blue:  '#3B82F6'
        }
      },
      boxShadow: {
        glow: '0 0 24px rgba(16, 185, 129, 0.25)'
      }
    }
  },
  plugins: []
};
