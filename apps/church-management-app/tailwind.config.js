/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,html}',
    './index.html',
  ],
  theme: {
    extend: {
      colors: {
        // ── Themed surfaces (CSS variables — change with theme) ──────────────
        background:            'rgb(var(--color-background) / <alpha-value>)',
        foreground:            'rgb(var(--color-foreground) / <alpha-value>)',
        card: {
          DEFAULT:             'rgb(var(--color-card) / <alpha-value>)',
          foreground:          'rgb(var(--color-card-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT:             'rgb(var(--color-secondary) / <alpha-value>)',
          foreground:          'rgb(var(--color-secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT:             'rgb(var(--color-muted) / <alpha-value>)',
          foreground:          'rgb(var(--color-muted-foreground) / <alpha-value>)',
        },
        border:                'rgb(var(--color-border) / <alpha-value>)',
        input:                 'rgb(var(--color-input) / <alpha-value>)',
        ring:                  'rgb(var(--color-ring) / <alpha-value>)',

        // ── Primary accent (CSS variable) ─────────────────────────────────────
        primary:               'rgb(var(--color-primary) / <alpha-value>)',
        'primary-foreground':  'rgb(var(--color-primary-foreground) / <alpha-value>)',

        // ── Olive / golden — aliases for primary (backward compat) ────────────
        // All existing text-olive, bg-olive/20, border-olive/30 etc. automatically
        // pick up the active theme's primary color.
        olive: {
          DEFAULT:             'rgb(var(--color-primary) / <alpha-value>)',
          light:               'rgb(var(--color-primary-light) / <alpha-value>)',
        },
        golden: {
          DEFAULT:             'rgb(var(--color-primary) / <alpha-value>)',
          light:               'rgb(var(--color-primary-light) / <alpha-value>)',
          pale:                'rgb(var(--color-cream) / <alpha-value>)',
        },

        // ── Page gradient tints ────────────────────────────────────────────────
        cream: {
          DEFAULT:             'rgb(var(--color-cream) / <alpha-value>)',
          dark:                'rgb(var(--color-cream-dark) / <alpha-value>)',
        },

        // ── Static brand colors (sidebar, accents — not themed) ───────────────
        navy: {
          DEFAULT:             '#1e3a8a',
          dark:                '#0e1d4a',
          light:               '#2563eb',
          muted:               '#3b82f6',
        },
        plum: {
          DEFAULT:             '#8e3168',
          light:               '#b04d88',
          dark:                '#6b2450',
          pale:                '#f5e6f0',
        },
        'cyan-brand': {
          DEFAULT:             '#4cb8d7',
          light:               '#7ecce3',
          dark:                '#2d9ab8',
          pale:                '#e6f7fb',
        },
        sidebar: {
          DEFAULT:             '#1a2d52',
          light:               '#243d6e',
          dark:                '#111e38',
          border:              'rgba(255,255,255,0.07)',
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
