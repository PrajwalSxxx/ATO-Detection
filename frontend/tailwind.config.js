/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paper and Ink Design System
        paper: {
          DEFAULT: '#F8F7F3',
          raised: '#FFFFFF',
          sunken: '#F1EFE9',
          hover: '#EFEDE6',
        },
        ink: {
          DEFAULT: '#161616',
          2: '#4A4A47',
          3: '#8A8984',
        },
        line: {
          DEFAULT: '#1A1A1A',
          soft: '#DDDAD1',
          dashed: '#B9B6AC',
        },
        // Muted Editorial Semantic Colors & Tints
        success: {
          DEFAULT: '#2F7D5B',
          tint: '#E6F1EA',
        },
        warning: {
          DEFAULT: '#B7791F',
          tint: '#F8EFD9',
        },
        danger: {
          DEFAULT: '#B3382C',
          tint: '#F6E2DE',
        },
        critical: {
          DEFAULT: '#8F1D14',
          tint: '#F1D4CF',
        },
        info: {
          DEFAULT: '#2F5D8A',
          tint: '#E3ECF4',
        },
        highlight: {
          DEFAULT: '#5B4BC4',
          tint: '#ECE9F9',
        },

        // Backward compatibility mappings (redirected to Paper & Ink tokens)
        'bg-base': '#F8F7F3',
        'bg-surface': '#FFFFFF',
        'bg-elevated': '#F1EFE9',
        'bg-hover': '#EFEDE6',
        'border-subtle': '#DDDAD1',
        'border-strong': '#1A1A1A',
        'text-primary': '#161616',
        'text-secondary': '#4A4A47',
        'text-muted': '#8A8984',
        'brand': '#161616',
        'brand-hover': '#4A4A47',
        'accent': '#5B4BC4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'hard': '3px 3px 0 0 #161616',
        'hard-sm': '2px 2px 0 0 #161616',
        'hard-lg': '4px 4px 0 0 #161616',
        'none': 'none',
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '10px',
        'lg': '14px',
      },
      fontSize: {
        'xs': ['12px', '16px'],
        'sm': ['13px', '18px'],
        'base': ['14px', '20px'],
        'md': ['16px', '24px'],
        'lg': ['20px', '28px'],
        'xl': ['28px', '34px'],
        '2xl': ['40px', '46px'],
      },
    },
  },
  plugins: [],
}
