# Design System - Quick Reference & Code Snippets

## Quick Start

1. Copy the CSS variables from `variables.css` into your project's root stylesheet
2. Use the design system tokens in your components
3. Reference the Tailwind config for automated utility classes
4. Follow the component examples below for consistent implementation

---

## Color Quick Reference

```css
/* Brand */
Primary: #2D1B4E    /* Dark purple */
Accent:  #F4C430    /* Gold */

/* Surfaces */
Light BG:    #FFFFFF
Subtle BG:   #F9F9F9
Alt Surface: #E8F4F8

/* Status */
Success: #D4EDDA    Warning: #FFF3CD
Error:   #F8D7DA    Info:    #D0E8F2
```

---

## HTML Component Snippets

### Button Examples

```html
<!-- Primary Button -->
<button class="btn btn-primary">
  Click Me
</button>

<!-- Secondary Button -->
<button class="btn btn-secondary">
  Cancel
</button>

<!-- Accent Button -->
<button class="btn btn-accent">
  Featured Action
</button>

<!-- With Icon -->
<button class="btn btn-primary">
  <svg class="w-4 h-4 inline mr-2"><!-- icon --></svg>
  Action
</button>

<!-- Disabled State -->
<button class="btn btn-primary opacity-50 cursor-not-allowed" disabled>
  Disabled
</button>
```

### Card Component

```html
<div class="card">
  <h2 class="text-h2 mb-4">Card Title</h2>
  <p class="text-body text-text-secondary mb-6">
    This is a card with descriptive content.
  </p>
  <button class="btn btn-primary">Action</button>
</div>

<!-- Card with Stats -->
<div class="card">
  <div class="grid grid-cols-3 gap-4">
    <div>
      <p class="text-body-sm text-text-secondary">Label</p>
      <p class="text-h2">37,989</p>
    </div>
    <div>
      <p class="text-body-sm text-text-secondary">Label</p>
      <p class="text-h2">26,534</p>
    </div>
    <div>
      <p class="text-body-sm text-text-secondary">Label</p>
      <p class="text-h2">279</p>
    </div>
  </div>
</div>
```

### Input Field

```html
<!-- Text Input -->
<div class="mb-4">
  <label class="block text-body font-medium mb-2">
    Input Label
  </label>
  <input 
    type="text" 
    class="input w-full" 
    placeholder="Enter text..."
  />
</div>

<!-- Textarea -->
<div class="mb-4">
  <label class="block text-body font-medium mb-2">
    Message
  </label>
  <textarea 
    class="input w-full resize-none" 
    rows="4" 
    placeholder="Type your message..."
  ></textarea>
</div>

<!-- Select Dropdown -->
<div class="mb-4">
  <label class="block text-body font-medium mb-2">
    Choose Option
  </label>
  <select class="input w-full">
    <option>Option 1</option>
    <option>Option 2</option>
    <option>Option 3</option>
  </select>
</div>

<!-- Search Input -->
<input 
  type="text" 
  class="input w-full" 
  placeholder="Search 311 requests..."
/>
```

### Status Badges

```html
<!-- Info Badge -->
<span class="badge badge-info">New</span>

<!-- Success Badge -->
<span class="badge badge-success">Completed</span>

<!-- Warning Badge -->
<span class="badge badge-warning">Overdue</span>

<!-- Error Badge -->
<span class="badge badge-error">Failed</span>

<!-- Large Badge -->
<div class="inline-flex items-center px-4 py-2 rounded-lg bg-status-success-bg border border-status-success-border text-status-success-text">
  ✓ Success Message
</div>
```

### Alert/Message Boxes

```html
<!-- Info Alert -->
<div class="p-4 rounded-lg bg-status-info-bg border border-status-info-border text-status-info-text">
  <p class="font-medium">Information</p>
  <p class="text-sm mt-1">This is an informational message.</p>
</div>

<!-- Success Alert -->
<div class="p-4 rounded-lg bg-status-success-bg border border-status-success-border text-status-success-text">
  <p class="font-medium">Success</p>
  <p class="text-sm mt-1">Your action was completed successfully.</p>
</div>

<!-- Warning Alert -->
<div class="p-4 rounded-lg bg-status-warning-bg border border-status-warning-border text-status-warning-text">
  <p class="font-medium">Warning</p>
  <p class="text-sm mt-1">This item requires your attention.</p>
</div>

<!-- Error Alert -->
<div class="p-4 rounded-lg bg-status-error-bg border border-status-error-border text-status-error-text">
  <p class="font-medium">Error</p>
  <p class="text-sm mt-1">An error occurred. Please try again.</p>
</div>
```

### Table Component

```html
<table class="w-full">
  <thead>
    <tr class="table-header">
      <th class="table-cell text-left">Case #</th>
      <th class="table-cell text-left">Type</th>
      <th class="table-cell text-left">Neighborhood</th>
      <th class="table-cell text-left">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr class="table-row">
      <td class="table-cell">26-00537266</td>
      <td class="table-cell">City Trash Can Concern</td>
      <td class="table-cell">Hampden</td>
      <td class="table-cell">
        <span class="badge badge-info">New</span>
      </td>
    </tr>
    <tr class="table-row">
      <td class="table-cell">26-00537265</td>
      <td class="table-cell">Housing Inspection</td>
      <td class="table-cell">Belair-Edison</td>
      <td class="table-cell">
        <span class="badge badge-success">Open</span>
      </td>
    </tr>
  </tbody>
</table>
```

### Header/Navigation

```html
<header class="header">
  <div class="flex items-center gap-4">
    <img src="logo.png" alt="Logo" class="h-8" />
    <h1 class="text-h2 text-white">311 Explorer</h1>
  </div>
  <nav class="flex items-center gap-4">
    <button class="text-header-fg hover:opacity-80">Filters</button>
    <button class="text-header-fg hover:opacity-80">Table</button>
    <button class="text-header-fg hover:opacity-80">Menu</button>
  </nav>
</header>
```

---

## React Component Examples

### Button Component

```jsx
// Button.jsx
export function Button({ 
  variant = 'primary', 
  size = 'md',
  children, 
  ...props 
}) {
  const baseClasses = 'font-medium rounded-md border-none cursor-pointer transition-all duration-200';
  
  const variantClasses = {
    primary: 'bg-primary text-text-inverse hover:bg-primary-dark',
    secondary: 'bg-surface-soft-bg text-text-primary border border-border-DEFAULT hover:bg-gray-100',
    accent: 'bg-accent text-text-primary hover:opacity-90',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Usage
<Button variant="primary" size="md">Click Me</Button>
<Button variant="secondary">Cancel</Button>
```

### Card Component

```jsx
// Card.jsx
export function Card({ title, children, footer }) {
  return (
    <div className="bg-surface-default border border-border-soft rounded-lg p-6 shadow-md">
      {title && (
        <h2 className="text-h2 mb-4 text-text-primary">{title}</h2>
      )}
      <div className="mb-6">{children}</div>
      {footer && (
        <div className="border-t border-border-soft pt-4 mt-4">
          {footer}
        </div>
      )}
    </div>
  );
}

// Usage
<Card title="Service Requests" footer={<Button>View All</Button>}>
  <p className="text-body">37,989 total requests</p>
</Card>
```

### Badge Component

```jsx
// Badge.jsx
export function Badge({ variant = 'info', children }) {
  const variantClasses = {
    info: 'bg-status-info-bg text-status-info-text border border-status-info-border',
    success: 'bg-status-success-bg text-status-success-text border border-status-success-border',
    warning: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
    error: 'bg-status-error-bg text-status-error-text border border-status-error-border',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium ${variantClasses[variant]}`}>
      {children}
    </span>
  );
}

// Usage
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Overdue</Badge>
```

### Input Component

```jsx
// Input.jsx
export function Input({ label, error, ...props }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-body font-medium mb-2 text-text-primary">
          {label}
        </label>
      )}
      <input 
        className={`bg-surface-default border rounded-md px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all duration-200 ${
          error ? 'border-status-error-border' : 'border-border-DEFAULT'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-status-error-text">{error}</p>
      )}
    </div>
  );
}

// Usage
<Input label="Email" type="email" placeholder="Enter email..." />
<Input label="Password" type="password" error="Password is required" />
```

### Alert Component

```jsx
// Alert.jsx
export function Alert({ variant = 'info', title, children }) {
  const variantClasses = {
    info: 'bg-status-info-bg border-status-info-border text-status-info-text',
    success: 'bg-status-success-bg border-status-success-border text-status-success-text',
    warning: 'bg-status-warning-bg border-status-warning-border text-status-warning-text',
    error: 'bg-status-error-bg border-status-error-border text-status-error-text',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      {title && <p className="font-medium">{title}</p>}
      <p className="text-sm mt-1">{children}</p>
    </div>
  );
}

// Usage
<Alert variant="success" title="Success">
  Your action was completed successfully.
</Alert>
```

### Table Component

```jsx
// Table.jsx
export function Table({ headers, rows }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-surface-subtle border-b border-border-soft">
          {headers.map((header) => (
            <th 
              key={header} 
              className="px-4 py-4 text-left text-body font-semibold text-text-primary"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, idx) => (
          <tr key={idx} className="border-b border-border-soft hover:bg-gray-50">
            {row.map((cell, cellIdx) => (
              <td 
                key={cellIdx} 
                className="px-4 py-4 text-body text-text-primary"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage
<Table 
  headers={['Case #', 'Type', 'Neighborhood', 'Status']}
  rows={[
    ['26-00537266', 'City Trash Concern', 'Hampden', 'New'],
    ['26-00537265', 'Housing Inspection', 'Belair-Edison', 'Open'],
  ]}
/>
```

### Header/Navigation Component

```jsx
// Header.jsx
export function Header({ logo, title, actions }) {
  return (
    <header className="bg-header-bg text-header-fg px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {logo && <img src={logo} alt="Logo" className="h-8" />}
        {title && <h1 className="text-h2">{title}</h1>}
      </div>
      <nav className="flex items-center gap-4">
        {actions?.map((action, idx) => (
          <button 
            key={idx} 
            className="hover:opacity-80 transition-opacity"
          >
            {action}
          </button>
        ))}
      </nav>
    </header>
  );
}

// Usage
<Header 
  title="311 Explorer"
  actions={['Filters', 'Table', 'Menu']}
/>
```

---

## Layout Patterns

### Full Page Layout

```html
<div class="min-h-screen bg-surface-default">
  <!-- Header -->
  <header class="header sticky top-0 z-10">
    <!-- header content -->
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-4 py-8">
    <!-- content -->
  </main>

  <!-- Footer -->
  <footer class="bg-surface-subtle border-t border-border-soft mt-8 py-4">
    <!-- footer content -->
  </footer>
</div>
```

### Two Column Layout

```html
<div class="grid grid-cols-3 gap-6">
  <!-- Main Content -->
  <div class="col-span-2">
    <div class="card">
      <!-- content -->
    </div>
  </div>

  <!-- Sidebar -->
  <div class="col-span-1">
    <div class="card">
      <!-- sidebar content -->
    </div>
  </div>
</div>
```

### Dashboard Grid

```html
<div class="grid grid-cols-4 gap-4 mb-8">
  <div class="card">
    <p class="text-body-sm text-text-secondary">Total Requests</p>
    <p class="text-h2 text-primary">37,989</p>
  </div>
  <div class="card">
    <p class="text-body-sm text-text-secondary">Open</p>
    <p class="text-h2 text-supporting">37,989</p>
  </div>
  <div class="card">
    <p class="text-body-sm text-text-secondary">Overdue</p>
    <p class="text-h2 text-status-error-text">26,534</p>
  </div>
  <div class="card">
    <p class="text-body-sm text-text-secondary">Neighborhoods</p>
    <p class="text-h2 text-chart-primary">279</p>
  </div>
</div>
```

---

## Common Usage Patterns

### Color Utilities
```html
<!-- Text Colors -->
<p class="text-text-primary">Primary text</p>
<p class="text-text-secondary">Secondary text</p>
<p class="text-text-inverse bg-primary p-4">Inverse text</p>

<!-- Background Colors -->
<div class="bg-primary text-white p-4">Primary background</div>
<div class="bg-surface-alt p-4">Alternative surface</div>

<!-- Border Colors -->
<div class="border border-border-DEFAULT p-4">Default border</div>
<div class="border-2 border-border-strong p-4">Strong border</div>
```

### Spacing Utilities
```html
<!-- Padding -->
<div class="p-md">Padding on all sides</div>
<div class="px-lg py-md">Horizontal and vertical padding</div>

<!-- Margin -->
<div class="mb-lg">Margin bottom</div>
<div class="mt-xl">Margin top</div>

<!-- Gap (Flexbox/Grid) -->
<div class="flex gap-md">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

---

## Accessibility Checklist

- [ ] Use semantic HTML (button, input, nav)
- [ ] Include labels for form inputs
- [ ] Ensure color contrast meets WCAG AA
- [ ] Provide focus indicators for keyboard nav
- [ ] Don't rely solely on color for meaning
- [ ] Include alt text for images
- [ ] Test with keyboard navigation
- [ ] Test with screen readers

---

---

## Dark Mode Support

### Dark Mode Colors Quick Reference

```css
/* Dark Mode Backgrounds */
Dark BG:         #0F1419
Dark Page BG:    #151D2B
Dark Surface:    #1B2635
Dark Card:       #1B2635

/* Dark Mode Text */
Light Text:      #FFFFFF
Secondary Text:  #A8A8A8
Gold Accent:     #E0B45A

/* Dark Mode Borders */
Dark Border:     #3A4A5A
```

### Dark Mode Toggle Button

```html
<!-- HTML with button -->
<header class="header">
  <h1>App Title</h1>
  <button class="dark-mode-toggle" id="themeToggle">
    <span class="light-icon">☀️</span>
    <span class="dark-icon" style="display:none;">🌙</span>
  </button>
</header>

<style>
  [data-theme="dark"] .light-icon { display: none; }
  [data-theme="dark"] .dark-icon { display: inline; }
</style>

<script>
  const toggle = document.getElementById('themeToggle');
  const theme = localStorage.getItem('theme') || 'system';
  
  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  toggle.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  });
</script>
```

### React Dark Mode Toggle

```jsx
// DarkModeToggle.jsx
import { useEffect, useState } from 'react';

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <button 
      onClick={() => setIsDark(!isDark)}
      className="p-2 rounded-md hover:bg-surface-soft-bg"
      aria-label="Toggle dark mode"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
```

### Dark Mode CSS

```css
/* Define both light and dark colors */
:root {
  --lp-bg: #FFFFFF;
  --lp-text-primary: #1A1A1A;
  --lp-border-default: #D1D5DB;
  /* ... light colors ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --lp-bg: #0F1419;
    --lp-text-primary: #FFFFFF;
    --lp-border-default: #3A4A5A;
    /* ... dark colors ... */
  }
}

/* Manual dark mode via data attribute */
[data-theme="dark"] {
  --lp-bg: #0F1419;
  --lp-text-primary: #FFFFFF;
  --lp-border-default: #3A4A5A;
}

[data-theme="light"] {
  --lp-bg: #FFFFFF;
  --lp-text-primary: #1A1A1A;
  --lp-border-default: #D1D5DB;
}

/* Smooth transitions between themes */
* {
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

### Tailwind Dark Mode

```html
<!-- Tailwind automatically handles dark mode with these setup styles -->
<div class="bg-surface-default text-text-primary border border-border-default">
  <!-- Content automatically switches colors in dark mode -->
</div>
```

---


