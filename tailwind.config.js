/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(214.3 31.8% 91.4%)",
        input: "hsl(214.3 31.8% 91.4%)",
        ring: "hsl(142 76% 36%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(222.2 84% 4.9%)",
        
        /* New design colors from HTML */
        primary: {
          DEFAULT: "hsl(210 11% 15%)", /* Medium-inspired dark gray */
          foreground: "hsl(0 0% 98%)",
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        secondary: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(210 11% 15%)",
        },
        accent: {
          DEFAULT: "hsl(210 40% 96%)",
          foreground: "hsl(210 11% 15%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84.2% 60.2%)",
          foreground: "hsl(210 40% 98%)",
        },
        muted: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(215 16% 47%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(210 11% 15%)",
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(210 11% 15%)",
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5' }],
        sm: ['0.875rem', { lineHeight: '1.5' }],
        base: ['1rem', { lineHeight: '1.6' }],
        lg: ['1.125rem', { lineHeight: '1.6' }],
        xl: ['1.25rem', { lineHeight: '1.5' }],
        '2xl': ['1.5rem', { lineHeight: '1.4' }],
        '3xl': ['1.875rem', { lineHeight: '1.3' }],
        '4xl': ['2.25rem', { lineHeight: '1.2' }],
      },
      spacing: {
        // 8px base spacing system - all values are multiples of 8px
        '0': '0px',        // 0px
        '0.5': '2px',      // 2px (0.25 * 8px)
        '1': '4px',        // 4px (0.5 * 8px)
        '1.5': '6px',      // 6px (0.75 * 8px)
        '2': '8px',        // 8px (1 * 8px) - base unit
        '2.5': '10px',     // 10px (1.25 * 8px)
        '3': '12px',       // 12px (1.5 * 8px)
        '3.5': '14px',     // 14px (1.75 * 8px)
        '4': '16px',       // 16px (2 * 8px)
        '5': '20px',       // 20px (2.5 * 8px)
        '6': '24px',       // 24px (3 * 8px)
        '7': '28px',       // 28px (3.5 * 8px)
        '8': '32px',       // 32px (4 * 8px)
        '9': '36px',       // 36px (4.5 * 8px)
        '10': '40px',      // 40px (5 * 8px)
        '11': '44px',      // 44px (5.5 * 8px)
        '12': '48px',      // 48px (6 * 8px)
        '14': '56px',      // 56px (7 * 8px)
        '16': '64px',      // 64px (8 * 8px)
        '18': '72px',      // 72px (9 * 8px)
        '20': '80px',      // 80px (10 * 8px)
        '24': '96px',      // 96px (12 * 8px)
        '28': '112px',     // 112px (14 * 8px)
        '32': '128px',     // 128px (16 * 8px)
        '36': '144px',     // 144px (18 * 8px)
        '40': '160px',     // 160px (20 * 8px)
        '44': '176px',     // 176px (22 * 8px)
        '48': '192px',     // 192px (24 * 8px)
        '52': '208px',     // 208px (26 * 8px)
        '56': '224px',     // 224px (28 * 8px)
        '60': '240px',     // 240px (30 * 8px)
        '64': '256px',     // 256px (32 * 8px)
        '72': '288px',     // 288px (36 * 8px)
        '80': '320px',     // 320px (40 * 8px)
        '96': '384px',     // 384px (48 * 8px)
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}