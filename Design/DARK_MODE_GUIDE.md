# Dark Mode Implementation Guide

This guide covers everything you need to implement dark mode in your application using the Baltimore 311 Explorer design system.

## Overview

The design system supports three dark mode scenarios:
1. **System Preference** - Automatically detects user's OS dark mode setting
2. **Manual Toggle** - User can toggle between light and dark modes
3. **Hybrid** - System preference with manual override option

## Color Values

### Light Mode (Default)
```
Background:      #FFFFFF
Surface:         #FFFFFF  
Text Primary:    #1A1A1A
Text Secondary:  #4A5568
Borders:         #D1D5DB
```

### Dark Mode
```
Background:      #0F1419
Surface:         #1B2635
Text Primary:    #FFFFFF
Text Secondary:  #A8A8A8
Borders:         #3A4A5A
```

## Quick Start

### 1. Include the CSS Variables File

```html
<head>
  <link rel="stylesheet" href="variables.css">
  <!-- Your other stylesheets -->
</head>
```

The `variables.css` file includes:
- Light mode colors (default)
- Dark mode colors (via `@media (prefers-color-scheme: dark)`)
- Dark mode colors (via `[data-theme="dark"]`)
- Utility classes for quick styling

### 2. Use CSS Variables in Your Styles

```css
.card {
  background-color: var(--lp-surface-default);
  color: var(--lp-text-primary);
  border: 1px solid var(--lp-border-default);
  box-shadow: var(--lp-shadow-md);
}

.button {
  background-color: var(--lp-brand-primary);
  color: var(--lp-text-inverse);
}
```

## Implementation Patterns

### Pattern 1: System Preference Only

The simplest implementation—no user control needed:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="variables.css">
</head>
<body>
  <h1>My App</h1>
  <!-- App automatically switches based on OS preference -->
</body>
</html>
```

**How it works:**
- CSS `@media (prefers-color-scheme: dark)` automatically activates
- No JavaScript required
- No localStorage needed

### Pattern 2: Manual Toggle (HTML/CSS/JS)

Allow users to manually switch themes:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="variables.css">
  <style>
    /* Icon switching */
    [data-theme="dark"] .icon-light { display: none; }
    [data-theme="light"] .icon-dark { display: none; }
  </style>
</head>
<body>
  <header>
    <h1>311 Explorer</h1>
    <button id="themeToggle" class="btn-toggle">
      <span class="icon-light">☀️ Light</span>
      <span class="icon-dark">🌙 Dark</span>
    </button>
  </header>

  <main>
    <!-- Your content -->
  </main>

  <script>
    class ThemeManager {
      constructor() {
        this.storageKey = 'theme-preference';
        this.htmlElement = document.documentElement;
        this.init();
      }

      init() {
        // Get saved preference or use system default
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
          this.setTheme(saved);
        } else {
          this.applySystemPreference();
        }

        // Listen for button clicks
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
          toggle.addEventListener('click', () => this.toggle());
        }

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (!localStorage.getItem(this.storageKey)) {
            this.applySystemPreference();
          }
        });
      }

      setTheme(theme) {
        if (theme === 'light') {
          this.htmlElement.setAttribute('data-theme', 'light');
          localStorage.setItem(this.storageKey, 'light');
        } else if (theme === 'dark') {
          this.htmlElement.setAttribute('data-theme', 'dark');
          localStorage.setItem(this.storageKey, 'dark');
        }
      }

      applySystemPreference() {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.htmlElement.removeAttribute('data-theme');
        // CSS media query handles the color switching
      }

      toggle() {
        const current = this.htmlElement.getAttribute('data-theme');
        if (current === 'dark') {
          this.setTheme('light');
        } else {
          this.setTheme('dark');
        }
      }
    }

    // Initialize on page load
    new ThemeManager();
  </script>
</body>
</html>
```

### Pattern 3: React Implementation

```jsx
// useTheme.js
import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Initialize from localStorage or system preference
    const saved = localStorage.getItem('theme-preference');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      localStorage.removeItem('theme-preference');
    } else {
      root.setAttribute('data-theme', theme);
      localStorage.setItem('theme-preference', theme);
    }
  }, [theme]);

  useEffect(() => {
    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const saved = localStorage.getItem('theme-preference');
      if (!saved) {
        setTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

// App.jsx
import { ThemeProvider, useTheme } from './useTheme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-controls">
      <button 
        onClick={() => setTheme('light')}
        className={theme === 'light' ? 'active' : ''}
      >
        ☀️ Light
      </button>
      <button 
        onClick={() => setTheme('dark')}
        className={theme === 'dark' ? 'active' : ''}
      >
        🌙 Dark
      </button>
      <button 
        onClick={() => setTheme('system')}
        className={theme === 'system' ? 'active' : ''}
      >
        🔄 System
      </button>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <header>
        <h1>311 Explorer</h1>
        <ThemeToggle />
      </header>
      {/* Rest of app */}
    </ThemeProvider>
  );
}

export default App;
```

### Pattern 4: Vue Implementation

```vue
<!-- DarkMode.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue'

const theme = ref('system')

onMounted(() => {
  // Load from localStorage
  const saved = localStorage.getItem('theme-preference')
  if (saved) {
    theme.value = saved
    applyTheme(saved)
  } else {
    applySystemTheme()
  }

  // Watch for system preference changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (theme.value === 'system') {
      applySystemTheme()
    }
  })
})

watch(theme, (newTheme) => {
  applyTheme(newTheme)
})

function applyTheme(newTheme) {
  if (newTheme === 'system') {
    document.documentElement.removeAttribute('data-theme')
    localStorage.removeItem('theme-preference')
  } else {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme-preference', newTheme)
  }
}

function applySystemTheme() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}
</script>

<template>
  <div class="theme-controls">
    <button
      v-for="option in ['light', 'dark', 'system']"
      :key="option"
      @click="theme = option"
      :class="{ active: theme === option }"
    >
      {{ option === 'light' ? '☀️' : option === 'dark' ? '🌙' : '🔄' }}
      {{ option }}
    </button>
  </div>
</template>
```

## Testing Dark Mode

### Browser DevTools Testing

**Chrome/Edge:**
1. Open DevTools (F12)
2. Click the three dots menu → More tools → Rendering
3. Scroll to "Emulate CSS media feature prefers-color-scheme"
4. Select "dark" or "light"

**Firefox:**
1. Open DevTools (F12)
2. Go to Inspector tab
3. Click the settings icon (gear)
4. Check "Disable browser chrome and extensions CSS"
5. In console: `document.documentElement.setAttribute('data-theme', 'dark')`

### Manual Testing Checklist

- [ ] Light mode colors display correctly
- [ ] Dark mode colors display correctly  
- [ ] Toggle button works (if implemented)
- [ ] Theme preference persists on refresh
- [ ] System preference is respected when no override is set
- [ ] All text is readable in both modes
- [ ] Contrast ratios meet WCAG AA (4.5:1 minimum)
- [ ] Status colors are visible in both modes
- [ ] Charts render correctly in both modes
- [ ] Focus indicators are visible in both modes
- [ ] No white text flashing on dark backgrounds
- [ ] Transitions are smooth (not jarring)

### Accessibility Testing

```javascript
// Test contrast ratios
// Using WebAIM Contrast Checker or similar
// All text should have at least 4.5:1 contrast

// Check system preference works
window.matchMedia('(prefers-color-scheme: dark)').matches
// Should return true/false based on OS setting
```

## Common Issues & Solutions

### Issue: Colors not switching

**Solution:** Ensure `variables.css` is included and `data-theme` attribute is being set correctly.

```javascript
// Debug
console.log(document.documentElement.getAttribute('data-theme'));
console.log(getComputedStyle(document.body).backgroundColor);
```

### Issue: Jarring transitions

**Solution:** The `variables.css` includes smooth transitions. If they're not working:

```css
/* Add to your main stylesheet */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

### Issue: Images too bright in dark mode

**Solution:** Adjust images for dark mode:

```css
[data-theme="dark"] img {
  opacity: 0.9;
  filter: brightness(0.9) contrast(1.1);
}
```

### Issue: Maps or embedded content not adapting

**Solution:** Some external content (maps, embedded videos) may need manual switching:

```javascript
function switchMapTheme(isDark) {
  // For mapbox, leaflet, etc.
  map.setStyle(isDark ? 'mapbox://styles/mapbox/dark-v10' : 'mapbox://styles/mapbox/light-v10');
}
```

## Performance Considerations

1. **Minimal Repaints:** CSS variables only affect styling, no layout recalculations
2. **No JavaScript Overhead:** System preference works with pure CSS
3. **localStorage:** Keep toggle state in localStorage (< 1KB)
4. **Transitions:** Use `transition: all 0.3s ease` for smooth switching

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support (15.1+)
- IE: ❌ Not supported (use light mode fallback)

## Resources

- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
- [CSS Variables Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WCAG Color Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)

## Next Steps

1. Choose your implementation pattern (system-only, toggle, or hybrid)
2. Copy the appropriate code from this guide
3. Test in multiple browsers
4. Verify contrast ratios meet WCAG standards
5. Get feedback from users
