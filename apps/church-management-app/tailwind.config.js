/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces ─────────────────────────────────────────────────────────
        background:            '#f5f2ed',          // warm off-white — suits gold
        foreground:            '#1c1917',           // Stone 900
        card:                  '#ffffff',
        'card-foreground':     '#1c1917',

        // ── Primary — Gold ───────────────────────────────────────────────────
        primary:               '#c8940f',           // rich amber-gold
        'primary-foreground':  '#ffffff',

        // ── Secondary ────────────────────────────────────────────────────────
        secondary:             '#f7f3ee',
        'secondary-foreground':'#44403c',

        // ── Muted ────────────────────────────────────────────────────────────
        muted: {
          DEFAULT:    '#ede9e3',
          foreground: '#78716c',                    // Stone 500
        },

        // ── Structural ───────────────────────────────────────────────────────
        border: '#ddd7cf',
        input:  '#c9c1b7',
        ring:   '#c8940f',

        // ── Brand navy (sidebar uses its own hex, these are for in-content) ──
        navy: {
          DEFAULT: '#1e3a8a',
          dark:    '#0e1d4a',
          light:   '#2563eb',
          muted:   '#3b82f6',
        },

        // ── Gold (decorative / auth panel) ───────────────────────────────────
        golden: {
          DEFAULT: '#c8940f',
          light:   '#e8a820',
          pale:    '#fef3c7',
        },
        olive: {
          DEFAULT: '#c8940f',
          light:   '#e8a820',
        },

        // ── Brand accent — Plum ──────────────────────────────────────────────
        plum: {
          DEFAULT: '#8e3168',
          light:   '#b04d88',
          dark:    '#6b2450',
          pale:    '#f5e6f0',
        },

        // ── Brand accent — Cyan ──────────────────────────────────────────────
        cyan: {
          brand:   '#4cb8d7',
          light:   '#7ecce3',
          dark:    '#2d9ab8',
          pale:    '#e6f7fb',
        },

        // ── Sidebar blue (used as bg token reference in layout) ──────────────
        sidebar: {
          DEFAULT: '#1a2d52',
          light:   '#243d6e',
          dark:    '#111e38',
          border:  'rgba(255,255,255,0.07)',
        },

        // ── Cream (for AuthLayout gradient) ──────────────────────────────────
        cream: {
          DEFAULT: '#faf6f0',
          dark:    '#f0ebe2',
        },
      },
      fontFamily: {
        display: ['IBM Plex Sans', 'sans-serif'],
        body:    ['IBM Plex Sans', 'sans-serif'],
        sans:    ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
