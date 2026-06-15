# Baltimore 311 Explorer Design System

## Overview
This design system provides a complete visual language for building government service dashboards and civic data applications. The system is built on a sophisticated color palette combining deep purple brand colors with gold accents and status-specific indicators.

---

## Color Palette

### Brand Colors

| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Primary | `--lp-brand-primary` | `#2D1B4E` | Primary buttons, headers, key UI elements |
| Primary Dark | `--lp-brand-primary-dark` | `#1A0F2E` | Darker accents, hover states |
| Accent | `--lp-brand-accent` | `#F4C430` | Highlights, important callouts |
| Supporting | `--lp-brand-supporting` | `#5DADE2` | Secondary elements, links |

### Background & Surface Colors

| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Background | `--lp-bg` | `#FFFFFF` | Page background |
| Page Background | `--lp-bg-page` | `#F5F5F5` | Secondary page areas |
| Surface Default | `--lp-surface-default` | `#FFFFFF` | Cards, panels, inputs |
| Surface Subtle | `--lp-surface-subtle` | `#F9F9F9` | Table headers, subtle containers |
| Surface Alt | `--lp-surface-alt` | `#E8F4F8` | Alternative surface treatment |
| Surface Elevated | `--lp-surface-elevated` | `#FFFFFF` | Elevated cards, modals |
| Surface Soft BG | `--lp-surface-soft-bg` | `#F0F0F0` | Soft button backgrounds |
| Surface Hero BG | `--lp-surface-hero-bg` | `#FFFFFF` | Large hero sections |

### Text Colors

| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Primary Text | `--lp-text-primary` | `#1A1A1A` | Main body text |
| Secondary Text | `--lp-text-secondary` | `#4A5568` | Supporting text, metadata |
| Inverse Text | `--lp-text-inverse` | `#FFFFFF` | Text on dark backgrounds |
| Eyebrow Text | `--lp-eyebrow-text` | `#2D1B4E` | Labels, eyebrow copy |

### Border Colors

| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Default | `--lp-border-default` | `#D1D5DB` | Standard borders |
| Soft | `--lp-border-soft` | `#E5E7EB` | Subtle dividers |
| Strong | `--lp-border-strong` | `#9CA3AF` | Emphasized borders |

### Status Colors

#### Info
- Background: `--lp-status-info-bg` → `#D0E8F2`
- Border: `--lp-status-info-border` → `#A0D8E8`
- Use for: Informational messages, status updates

#### Success
- Background: `--lp-status-success-bg` → `#D4EDDA`
- Border: `--lp-status-success-border` → `#C3E6CB`
- Use for: Confirmations, completed tasks, positive indicators

#### Warning
- Background: `--lp-status-warning-bg` → `#FFF3CD`
- Border: `--lp-status-warning-border` → `#FFEEBA`
- Use for: Cautions, attention needed, overdue items

#### Error
- Background: `--lp-status-error-bg` → `#F8D7DA`
- Border: `--lp-status-error-border` → `#F5C6CB`
- Use for: Errors, failures, critical issues

### Chart Colors

Use these colors in order for data visualization:

| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Fill Primary | `--lp-chart-fill-primary` | `#2D1B4E` | Primary data series |
| Fill Secondary | `--lp-chart-fill-secondary` | `#F4C430` | Secondary data series |
| Fill Tertiary | `--lp-chart-fill-tertiary` | `#5DADE2` | Tertiary data series |
| Track | `--lp-chart-track` | `#E8E8E8` | Background tracks, axes |

### Header Colors

| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Header Background | `--lp-header-bg` | `#1A0F2E` | Navigation bars, top headers |
| Header Foreground | `--lp-header-foreground` | `#FFFFFF` | Text on header background |

---

## Typography

### Font Family
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Heading Styles

#### H1 - Main Page Title
```css
font-size: 2rem;
font-weight: bold;
line-height: 1.2;
color: var(--lp-text-primary);
```

#### H2 - Section Title
```css
font-size: 1.5rem;
font-weight: bold;
line-height: 1.3;
color: var(--lp-text-primary);
```

#### H3 - Subsection Title
```css
font-size: 1.25rem;
font-weight: 600;
line-height: 1.4;
color: var(--lp-text-primary);
```

### Body Text

#### Regular
```css
font-size: 1rem;
font-weight: 400;
line-height: 1.5;
color: var(--lp-text-primary);
```

#### Small
```css
font-size: 0.875rem;
font-weight: 400;
line-height: 1.4;
color: var(--lp-text-secondary);
```

---

## Spacing Scale

Maintain consistent spacing throughout your design:

```css
xs   → 0.25rem (4px)
sm   → 0.5rem  (8px)
md   → 1rem    (16px)
lg   → 1.5rem  (24px)
xl   → 2rem    (32px)
2xl  → 3rem    (48px)
3xl  → 4rem    (64px)
```

**Usage**: Use these values for margins, padding, and gaps between elements.

---

## Components

### Buttons

#### Primary Button
```css
background-color: var(--lp-brand-primary);
color: var(--lp-text-inverse);
padding: 0.75rem 1.5rem;
border-radius: 0.375rem;
font-weight: 500;
border: none;
cursor: pointer;
transition: background-color 0.2s ease;
```

#### Secondary Button
```css
background-color: var(--lp-surface-soft-bg);
color: var(--lp-text-primary);
padding: 0.75rem 1.5rem;
border-radius: 0.375rem;
font-weight: 500;
border: 1px solid var(--lp-border-default);
cursor: pointer;
```

#### Accent Button
```css
background-color: var(--lp-brand-accent);
color: var(--lp-text-primary);
padding: 0.75rem 1.5rem;
border-radius: 0.375rem;
font-weight: 500;
border: none;
cursor: pointer;
```

### Cards

```css
background-color: var(--lp-surface-default);
border: 1px solid var(--lp-border-soft);
border-radius: 0.5rem;
padding: 1.5rem;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
```

### Input Fields

```css
background-color: var(--lp-surface-default);
border: 1px solid var(--lp-border-default);
border-radius: 0.375rem;
padding: 0.75rem 1rem;
font-size: 1rem;
color: var(--lp-text-primary);
transition: border-color 0.2s ease;
```

**Focus State:**
```css
border-color: var(--lp-brand-primary);
outline: none;
box-shadow: 0 0 0 3px rgba(45, 27, 78, 0.1);
```

### Status Badges

#### Info Badge
```css
background-color: var(--lp-status-info-bg);
color: #0c5460;
padding: 0.25rem 0.75rem;
border-radius: 0.25rem;
font-size: 0.875rem;
font-weight: 500;
```

#### Success Badge
```css
background-color: var(--lp-status-success-bg);
color: #155724;
```

#### Warning Badge
```css
background-color: var(--lp-status-warning-bg);
color: #856404;
```

#### Error Badge
```css
background-color: var(--lp-status-error-bg);
color: #721c24;
```

### Tables

```css
.table {
  background-color: var(--lp-surface-default);
  border-collapse: collapse;
}

.table-header {
  background-color: var(--lp-surface-subtle);
  color: var(--lp-text-primary);
  font-weight: 600;
}

.table-row {
  border-bottom: 1px solid var(--lp-border-soft);
}

.table-row:hover {
  background-color: #F9F9F9;
}

.table-cell {
  padding: 1rem;
  color: var(--lp-text-primary);
}
```

---

## Elevation & Shadows

Create depth with these shadow values:

```css
.elevation-none    { box-shadow: 0; }
.elevation-sm      { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
.elevation-md      { box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
.elevation-lg      { box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
.elevation-xl      { box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1); }
```

---

## Border Radius

Consistent rounding throughout:

```css
.rounded-none   { border-radius: 0; }
.rounded-sm     { border-radius: 0.125rem; }
.rounded-md     { border-radius: 0.375rem; }
.rounded-lg     { border-radius: 0.5rem; }
.rounded-full   { border-radius: 9999px; }
```

---

## CSS Variables Implementation

### Setup in Your Root Stylesheet

```css
:root {
  /* Brand Colors */
  --lp-brand-primary: #2D1B4E;
  --lp-brand-primary-dark: #1A0F2E;
  --lp-brand-accent: #F4C430;
  --lp-brand-supporting: #5DADE2;

  /* Background Colors */
  --lp-bg: #FFFFFF;
  --lp-bg-page: #F5F5F5;
  --lp-surface-default: #FFFFFF;
  --lp-surface-subtle: #F9F9F9;
  --lp-surface-alt: #E8F4F8;
  --lp-surface-elevated: #FFFFFF;
  --lp-surface-soft-bg: #F0F0F0;
  --lp-surface-hero-bg: #FFFFFF;

  /* Text Colors */
  --lp-text-primary: #1A1A1A;
  --lp-text-secondary: #4A5568;
  --lp-text-inverse: #FFFFFF;
  --lp-eyebrow-text: #2D1B4E;

  /* Border Colors */
  --lp-border-default: #D1D5DB;
  --lp-border-soft: #E5E7EB;
  --lp-border-strong: #9CA3AF;

  /* Status Colors */
  --lp-status-info-bg: #D0E8F2;
  --lp-status-info-border: #A0D8E8;
  --lp-status-success-bg: #D4EDDA;
  --lp-status-success-border: #C3E6CB;
  --lp-status-warning-bg: #FFF3CD;
  --lp-status-warning-border: #FFEEBA;
  --lp-status-error-bg: #F8D7DA;
  --lp-status-error-border: #F5C6CB;

  /* Chart Colors */
  --lp-chart-fill-primary: #2D1B4E;
  --lp-chart-fill-secondary: #F4C430;
  --lp-chart-fill-tertiary: #5DADE2;
  --lp-chart-track: #E8E8E8;

  /* Header Colors */
  --lp-header-bg: #1A0F2E;
  --lp-header-foreground: #FFFFFF;
}
```

### Usage in Components

```css
.button-primary {
  background-color: var(--lp-brand-primary);
  color: var(--lp-text-inverse);
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
}

.card {
  background-color: var(--lp-surface-default);
  border: 1px solid var(--lp-border-soft);
}

.badge-success {
  background-color: var(--lp-status-success-bg);
  border: 1px solid var(--lp-status-success-border);
  color: #155724;
}
```

---

## Design Patterns & Best Practices

### Data Visualization
- Use chart colors in the specified order for multi-series data
- Primary purple for most important data
- Gold accent for comparative or secondary data
- Teal for supporting metrics
- Gray track for axis lines and backgrounds

### Status Indicators
- Always combine background and border colors
- Use status colors consistently across the application
- Label status clearly with text or icons

### Text Hierarchy
- Use primary text for main content
- Secondary text for supporting information
- Eyebrow text for labels and categories
- Inverse text exclusively on dark backgrounds

### Spacing
- Maintain consistent spacing using the provided scale
- Avoid arbitrary padding/margin values
- Group related elements with smaller spacing
- Separate sections with larger spacing

### Interactive States
- Buttons should have hover, active, and focus states
- Input fields should show focus rings
- Links should use the supporting color with underlines
- Disabled states should be visually distinct

### Layout Considerations
- Header: Always use `--lp-header-bg` with `--lp-header-foreground`
- Page background: Use `--lp-bg-page` for main content areas
- Cards and panels: Use `--lp-surface-default` with subtle borders
- Modals and overlays: Use `--lp-surface-elevated`

---

## Accessibility Considerations

- Ensure sufficient color contrast for text (WCAG AA minimum)
- Don't rely solely on color to convey information
- Include labels for all form inputs
- Use semantic HTML elements (button, input, nav, etc.)
- Include focus indicators for keyboard navigation
- Test status colors with color-blind vision simulators

---

## Dark Mode Support

The design system includes complete dark mode theming. Dark mode automatically activates based on user's system preferences or can be manually toggled.

### Dark Mode Color Palette

#### Dark Mode Backgrounds
| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Background | `--lp-bg-dark` | `#0F1419` | Page background |
| Page Background | `--lp-bg-page-dark` | `#151D2B` | Secondary page areas |
| Surface Default | `--lp-surface-default-dark` | `#1B2635` | Cards, panels, inputs |
| Surface Subtle | `--lp-surface-subtle-dark` | `#252E3D` | Table headers, subtle containers |
| Surface Alt | `--lp-surface-alt-dark` | `#1E2A39` | Alternative surface treatment |
| Surface Elevated | `--lp-surface-elevated-dark` | `#212D3B` | Elevated cards, modals |
| Surface Soft BG | `--lp-surface-soft-bg-dark` | `#2A3545` | Soft button backgrounds |

#### Dark Mode Text
| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Primary Text | `--lp-text-primary-dark` | `#FFFFFF` | Main body text |
| Secondary Text | `--lp-text-secondary-dark` | `#A8A8A8` | Supporting text, metadata |
| Inverse Text | `--lp-text-inverse-dark` | `#0F1419` | Text on light backgrounds (rare) |
| Eyebrow Text | `--lp-eyebrow-text-dark` | `#E0B45A` | Labels, eyebrow copy |

#### Dark Mode Borders
| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Default | `--lp-border-default-dark` | `#3A4A5A` | Standard borders |
| Soft | `--lp-border-soft-dark` | `#2E3D4D` | Subtle dividers |
| Strong | `--lp-border-strong-dark` | `#4A5A6A` | Emphasized borders |

#### Dark Mode Status Colors
| Status | Background | Border | Usage |
|--------|-----------|--------|-------|
| Info | `--lp-status-info-bg-dark: #1A3A4D` | `--lp-status-info-border-dark: #2A5A7D` | Informational |
| Success | `--lp-status-success-bg-dark: #1A3A2A` | `--lp-status-success-border-dark: #2A6A4A` | Success states |
| Warning | `--lp-status-warning-bg-dark: #4A3A1A` | `--lp-status-warning-border-dark: #7A6A3A` | Warnings |
| Error | `--lp-status-error-bg-dark: #4A1A2A` | `--lp-status-error-border-dark: #7A3A4A` | Errors |

#### Dark Mode Header
| Name | CSS Variable | Hex Value | Usage |
|------|--------------|-----------|-------|
| Header Background | `--lp-header-bg-dark` | `#0F1419` | Navigation bars |
| Header Foreground | `--lp-header-foreground-dark` | `#FFFFFF` | Text on header |

### CSS Implementation

```css
/* Light mode (default) */
:root {
  /* Brand Colors */
  --lp-brand-primary: #2D1B4E;
  --lp-brand-primary-dark: #1A0F2E;
  --lp-brand-accent: #F4C430;
  --lp-brand-supporting: #5DADE2;

  /* Light Mode Colors */
  --lp-bg: #FFFFFF;
  --lp-bg-page: #F5F5F5;
  --lp-surface-default: #FFFFFF;
  --lp-surface-subtle: #F9F9F9;
  --lp-surface-alt: #E8F4F8;
  --lp-surface-elevated: #FFFFFF;
  --lp-surface-soft-bg: #F0F0F0;
  
  --lp-text-primary: #1A1A1A;
  --lp-text-secondary: #4A5568;
  --lp-text-inverse: #FFFFFF;
  --lp-eyebrow-text: #2D1B4E;
  
  --lp-border-default: #D1D5DB;
  --lp-border-soft: #E5E7EB;
  --lp-border-strong: #9CA3AF;

  /* Status Colors */
  --lp-status-info-bg: #D0E8F2;
  --lp-status-info-border: #A0D8E8;
  --lp-status-success-bg: #D4EDDA;
  --lp-status-success-border: #C3E6CB;
  --lp-status-warning-bg: #FFF3CD;
  --lp-status-warning-border: #FFEEBA;
  --lp-status-error-bg: #F8D7DA;
  --lp-status-error-border: #F5C6CB;

  /* Header Colors */
  --lp-header-bg: #1A0F2E;
  --lp-header-foreground: #FFFFFF;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    /* Brand Colors (unchanged) */
    --lp-brand-primary: #2D1B4E;
    --lp-brand-primary-dark: #1A0F2E;
    --lp-brand-accent: #F4C430;
    --lp-brand-supporting: #5DADE2;

    /* Dark Mode Colors */
    --lp-bg: #0F1419;
    --lp-bg-page: #151D2B;
    --lp-surface-default: #1B2635;
    --lp-surface-subtle: #252E3D;
    --lp-surface-alt: #1E2A39;
    --lp-surface-elevated: #212D3B;
    --lp-surface-soft-bg: #2A3545;

    --lp-text-primary: #FFFFFF;
    --lp-text-secondary: #A8A8A8;
    --lp-text-inverse: #0F1419;
    --lp-eyebrow-text: #E0B45A;

    --lp-border-default: #3A4A5A;
    --lp-border-soft: #2E3D4D;
    --lp-border-strong: #4A5A6A;

    /* Status Colors - Dark variants */
    --lp-status-info-bg: #1A3A4D;
    --lp-status-info-border: #2A5A7D;
    --lp-status-success-bg: #1A3A2A;
    --lp-status-success-border: #2A6A4A;
    --lp-status-warning-bg: #4A3A1A;
    --lp-status-warning-border: #7A6A3A;
    --lp-status-error-bg: #4A1A2A;
    --lp-status-error-border: #7A3A4A;

    /* Header Colors */
    --lp-header-bg: #0F1419;
    --lp-header-foreground: #FFFFFF;
  }
}

/* Manual Dark Mode Toggle (if needed) */
[data-theme="dark"] {
  /* Same as @media (prefers-color-scheme: dark) */
  --lp-bg: #0F1419;
  --lp-bg-page: #151D2B;
  /* ... rest of dark colors ... */
}

[data-theme="light"] {
  /* Same as :root defaults */
  --lp-bg: #FFFFFF;
  --lp-bg-page: #F5F5F5;
  /* ... rest of light colors ... */
}
```

### Implementing Dark Mode Toggle

#### JavaScript

```javascript
// Dark mode toggle functionality
class DarkModeToggle {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'system';
    this.applyTheme();
  }

  applyTheme() {
    const isDark = this.theme === 'dark' || 
      (this.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  setSystem() {
    this.theme = 'system';
    localStorage.setItem('theme', 'system');
    this.applyTheme();
  }
}

// Initialize on page load
const darkMode = new DarkModeToggle();

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem('theme') === 'system') {
    darkMode.applyTheme();
  }
});
```

#### React Hook

```jsx
// useDarkMode.js
import { useEffect, useState } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const saved = localStorage.getItem('theme');
      if (!saved || saved === 'system') {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return {
    isDark,
    toggle: () => setIsDark(!isDark),
    setSystem: () => {
      localStorage.removeItem('theme');
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  };
}

// Usage in component
function App() {
  const { isDark, toggle } = useDarkMode();

  return (
    <div>
      <button onClick={toggle}>
        {isDark ? '☀️ Light' : '🌙 Dark'}
      </button>
    </div>
  );
}
```

### Dark Mode Best Practices

1. **Contrast Ratios**
   - Ensure text meets WCAG AA contrast standards in dark mode
   - Primary text should be high contrast (#FFFFFF on dark backgrounds)
   - Secondary text should still be readable (#A8A8A8 minimum)

2. **Color Adjustments**
   - Brand accent (#F4C430) remains vibrant in dark mode
   - Status colors should be more muted in dark mode
   - Avoid using pure white (#FFFFFF) on dark black backgrounds—use near-white instead

3. **Component Behavior**
   - Cards should have subtle borders to differentiate from background
   - Hover states should be slightly lighter backgrounds
   - Shadows are often invisible in dark mode—use borders instead

4. **Image Handling**
   - Consider adding `filter: brightness(0.8)` to images in dark mode
   - Use SVGs instead of PNGs for better dark mode support
   - Test all images for readability in dark mode

5. **Transparency**
   - Avoid transparent overlays—use explicit dark colors instead
   - Adjust opacity of secondary elements for readability

### Dark Mode Component Example

```css
/* Card in both themes */
.card {
  background-color: var(--lp-surface-default);
  border: 1px solid var(--lp-border-soft);
  color: var(--lp-text-primary);
  border-radius: 0.5rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: var(--lp-border-default);
  /* In light mode: slightly gray border
     In dark mode: slightly lighter border */
}

/* Button in both themes */
.btn-primary {
  background-color: var(--lp-brand-primary);
  color: var(--lp-text-inverse);
  /* Always white text on purple */
}

.btn-secondary {
  background-color: var(--lp-surface-soft-bg);
  color: var(--lp-text-primary);
  border: 1px solid var(--lp-border-default);
  /* Light gray in light mode, darker gray in dark mode */
}

/* Automatic transitions */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

### Testing Dark Mode

1. **System Preference Test**
   - Set OS to dark mode and verify colors
   - Set OS to light mode and verify colors

2. **Manual Toggle Test**
   - Ensure toggle button works correctly
   - Verify localStorage persistence
   - Check page reload maintains theme

3. **Component Testing**
   - Test all status colors in dark mode
   - Test charts and visualizations
   - Test tables and data displays
   - Test form inputs and focus states

4. **Contrast Testing**
   - Use tools like WebAIM Contrast Checker
   - Run Lighthouse accessibility audit
   - Test with color-blind simulators

---

## File Structure for Implementation

```
project/
├── styles/
│   ├── variables.css       (CSS variables definition)
│   ├── typography.css      (Font sizes, weights, line-heights)
│   ├── components.css      (Button, card, badge styles)
│   ├── layout.css          (Spacing and layout patterns)
│   └── main.css            (All imports)
├── components/
│   ├── Button.jsx
│   ├── Card.jsx
│   ├── Input.jsx
│   └── Badge.jsx
└── design-system.json      (This reference document)
```

---

## Integration Examples

### React Example
```jsx
// Button component
function Button({ variant = 'primary', children, ...props }) {
  return (
    <button className={`btn btn-${variant}`} {...props}>
      {children}
    </button>
  );
}

// CSS
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: var(--lp-brand-primary);
  color: var(--lp-text-inverse);
}

.btn-secondary {
  background-color: var(--lp-surface-soft-bg);
  color: var(--lp-text-primary);
  border: 1px solid var(--lp-border-default);
}
```

### HTML Example
```html
<div class="card">
  <h2 class="heading-2">Service Requests</h2>
  <p class="body-text">37,989 total requests</p>
  <button class="btn btn-primary">View Details</button>
</div>
```

---

## Maintenance & Updates

This design system should be reviewed and updated regularly as the application evolves. Document any changes and communicate updates to all team members using this system.

Last Updated: 2026
Version: 1.0.0
