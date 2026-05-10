/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: 'oklch(0.09 0.009 30)',
          900: 'oklch(0.12 0.009 30)',
          800: 'oklch(0.17 0.009 30)',
          700: 'oklch(0.23 0.009 30)',
          600: 'oklch(0.29 0.008 30)',
        },
        text: {
          1: 'oklch(0.96 0.006 30)',
          2: 'oklch(0.70 0.005 30)',
          3: 'oklch(0.46 0.004 30)',
        },
        accent: {
          DEFAULT: 'oklch(0.66 0.26 285)',
          bright:  'oklch(0.76 0.26 285)',
          dim:     'oklch(0.66 0.26 285 / 0.13)',
          fg:      'oklch(0.97 0.005 285)',
        },
        success: {
          DEFAULT: 'oklch(0.72 0.16 148)',
          dim:     'oklch(0.72 0.16 148 / 0.13)',
        },
        warning: {
          DEFAULT: 'oklch(0.81 0.18 55)',
          dim:     'oklch(0.81 0.18 55 / 0.13)',
        },
        danger: {
          DEFAULT: 'oklch(0.65 0.22 22)',
          dim:     'oklch(0.65 0.22 22 / 0.13)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
    },
  },
  plugins: [],
}

