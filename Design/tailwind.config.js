/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors (same in both modes)
        primary: {
          DEFAULT: '#2D1B4E',
          dark: '#1A0F2E',
        },
        accent: '#F4C430',
        supporting: '#5DADE2',

        // Background & Surface
        surface: {
          // Light mode
          default: 'var(--lp-surface-default, #FFFFFF)',
          subtle: 'var(--lp-surface-subtle, #F9F9F9)',
          alt: 'var(--lp-surface-alt, #E8F4F8)',
          elevated: 'var(--lp-surface-elevated, #FFFFFF)',
          'soft-bg': 'var(--lp-surface-soft-bg, #F0F0F0)',
          'hero-bg': 'var(--lp-surface-hero-bg, #FFFFFF)',
          // Dark mode overrides via CSS variables
        },

        // Text
        text: {
          primary: 'var(--lp-text-primary, #1A1A1A)',
          secondary: 'var(--lp-text-secondary, #4A5568)',
          inverse: 'var(--lp-text-inverse, #FFFFFF)',
          eyebrow: 'var(--lp-eyebrow-text, #2D1B4E)',
        },

        // Border
        border: {
          DEFAULT: 'var(--lp-border-default, #D1D5DB)',
          soft: 'var(--lp-border-soft, #E5E7EB)',
          strong: 'var(--lp-border-strong, #9CA3AF)',
        },

        // Status Colors
        status: {
          info: {
            bg: 'var(--lp-status-info-bg, #D0E8F2)',
            border: 'var(--lp-status-info-border, #A0D8E8)',
            text: 'var(--lp-status-info-text, #0c5460)',
          },
          success: {
            bg: 'var(--lp-status-success-bg, #D4EDDA)',
            border: 'var(--lp-status-success-border, #C3E6CB)',
            text: 'var(--lp-status-success-text, #155724)',
          },
          warning: {
            bg: 'var(--lp-status-warning-bg, #FFF3CD)',
            border: 'var(--lp-status-warning-border, #FFEEBA)',
            text: 'var(--lp-status-warning-text, #856404)',
          },
          error: {
            bg: 'var(--lp-status-error-bg, #F8D7DA)',
            border: 'var(--lp-status-error-border, #F5C6CB)',
            text: 'var(--lp-status-error-text, #721c24)',
          },
        },

        // Chart Colors
        chart: {
          primary: '#2D1B4E',
          secondary: '#F4C430',
          tertiary: '#5DADE2',
          track: 'var(--lp-chart-track, #E8E8E8)',
        },

        // Header
        header: {
          bg: 'var(--lp-header-bg, #1A0F2E)',
          fg: 'var(--lp-header-foreground, #FFFFFF)',
        },
      },

      // Spacing
      spacing: {
        'xs': '0.25rem',
        'sm': '0.5rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '3rem',
        '3xl': '4rem',
      },

      // Typography
      fontSize: {
        'h1': ['2rem', { lineHeight: '1.2', fontWeight: 'bold' }],
        'h2': ['1.5rem', { lineHeight: '1.3', fontWeight: 'bold' }],
        'h3': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
      },

      // Border Radius
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'full': '9999px',
      },

      // Box Shadow / Elevation
      boxShadow: {
        'none': '0',
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 1px 3px rgba(0, 0, 0, 0.1)',
        'lg': '0 4px 6px rgba(0, 0, 0, 0.1)',
        'xl': '0 10px 15px rgba(0, 0, 0, 0.1)',
      },

      // Font Family
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          "'Helvetica Neue'",
          'Arial',
          'sans-serif',
        ],
        mono: ["'Monaco'", "'Courier New'", 'monospace'],
      },
    },
  },

  plugins: [
    // Plugin for status badge variants
    function ({ addComponents, theme }) {
      addComponents({
        // Button Components
        '.btn': {
          '@apply': 'px-6 py-3 rounded-md font-medium border-none cursor-pointer transition-all duration-200',
        },
        '.btn-primary': {
          '@apply': 'bg-primary text-text-inverse hover:bg-primary-dark',
        },
        '.btn-secondary': {
          '@apply': 'bg-surface-soft-bg text-text-primary border border-border-DEFAULT hover:bg-gray-100',
        },
        '.btn-accent': {
          '@apply': 'bg-accent text-text-primary hover:opacity-90',
        },

        // Card Component
        '.card': {
          '@apply': 'bg-surface-default border border-border-soft rounded-lg p-6 shadow-md',
        },

        // Input Component
        '.input': {
          '@apply': 'bg-surface-default border border-border-DEFAULT rounded-md px-4 py-3 text-base text-text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200',
        },

        // Badge Components
        '.badge': {
          '@apply': 'inline-flex items-center px-3 py-1 rounded text-sm font-medium',
        },
        '.badge-info': {
          '@apply': 'bg-status-info-bg text-status-info-text border border-status-info-border',
        },
        '.badge-success': {
          '@apply': 'bg-status-success-bg text-status-success-text border border-status-success-border',
        },
        '.badge-warning': {
          '@apply': 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
        },
        '.badge-error': {
          '@apply': 'bg-status-error-bg text-status-error-text border border-status-error-border',
        },

        // Header Component
        '.header': {
          '@apply': 'bg-header-bg text-header-fg px-6 py-4 flex items-center justify-between',
        },

        // Table Components
        '.table-header': {
          '@apply': 'bg-surface-subtle text-text-primary font-semibold',
        },
        '.table-row': {
          '@apply': 'border-b border-border-soft hover:bg-gray-50 transition-colors',
        },
        '.table-cell': {
          '@apply': 'px-4 py-4 text-text-primary',
        },

        // Text Utilities
        '.text-primary': {
          '@apply': 'text-text-primary',
        },
        '.text-secondary': {
          '@apply': 'text-text-secondary',
        },
        '.text-inverse': {
          '@apply': 'text-text-inverse',
        },
        '.text-eyebrow': {
          '@apply': 'text-text-eyebrow text-sm font-medium uppercase tracking-wide',
        },
      });
    },
  ],
};
