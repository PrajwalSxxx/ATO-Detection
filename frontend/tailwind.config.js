/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dynamic Paper and Ink Design System (CSS variable driven)
        paper: {
          DEFAULT: 'var(--paper)',
          raised: 'var(--paper-raised)',
          sunken: 'var(--paper-sunken)',
          hover: 'var(--paper-hover)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        line: {
          DEFAULT: 'var(--line)',
          soft: 'var(--line-soft)',
          dashed: 'var(--line-dashed)',
        },
        // Muted Editorial Semantic Colors & Tints
        success: {
          DEFAULT: 'var(--success)',
          tint: 'var(--success-tint)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          tint: 'var(--warning-tint)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          tint: 'var(--danger-tint)',
        },
        critical: {
          DEFAULT: 'var(--critical)',
          tint: 'var(--critical-tint)',
        },
        info: {
          DEFAULT: 'var(--info)',
          tint: 'var(--info-tint)',
        },
        highlight: {
          DEFAULT: 'var(--highlight)',
          tint: 'var(--highlight-tint)',
        },

        // Backward compatibility mappings
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-hover': 'var(--bg-hover)',
        'border-subtle': 'var(--border-subtle)',
        'border-strong': 'var(--border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'brand': 'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'accent': 'var(--accent)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'hard': '3px 3px 0 0 var(--shadow-ink, var(--ink))',
        'hard-sm': '2px 2px 0 0 var(--shadow-ink, var(--ink))',
        'hard-lg': '4px 4px 0 0 var(--shadow-ink, var(--ink))',
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
