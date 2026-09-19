# Sticky & Scroll Patterns

Complex scroll-based layout patterns and their responsive considerations. These are where responsive design breaks hardest — they need explicit patterns, not intuition.

---

## Multiple Sticky Elements

When a page has sticky header + sticky subnav + sticky sidebar, they need coordinated offsets and z-index management.

### Stacking Multiple Sticky Elements

Use CSS custom properties so `top` offsets auto-update at breakpoints:

```css
:root {
  --header-height: 60px;
  --subnav-height: 40px;
}

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  height: var(--header-height);
}

.subnav {
  position: sticky;
  top: var(--header-height);
  z-index: 90;
  height: var(--subnav-height);
}

.table-header {
  position: sticky;
  top: calc(var(--header-height) + var(--subnav-height));
  z-index: 80;
}

.sidebar {
  position: sticky;
  top: calc(var(--header-height) + 1rem);
  align-self: start;  /* CRITICAL — see below */
  height: fit-content;
}
```

**Responsive breakpoint updates — mobile-first, change one variable, everything adjusts:**

```css
/* Mobile base values */
:root {
  --header-height: 52px;
  --subnav-height: 0px; /* subnav is a dropdown on mobile */
}

@media (min-width: 769px) {
  :root {
    --header-height: 60px;
    --subnav-height: 40px;
  }
}
```

### The align-self: start Rule

**This is the single most missed sticky detail.** In flex and grid containers, children stretch to fill their row by default. A sidebar that stretches to full height is already as tall as the content — sticky has no room to "stick" because the element never scrolls past the viewport.

```css
/* Without this, sticky sidebar silently fails in flex/grid */
.sidebar {
  position: sticky;
  top: var(--header-height);
  align-self: start;  /* required */
}
```

### Z-Index Scale

Use a tiered scale — don't escalate arbitrarily:

```css
:root {
  --z-sticky: 100;
  --z-subnav: 90;
  --z-sidebar: 80;
  --z-drawer: 200;
  --z-modal: 300;
  --z-toast: 400;
}
```

---

## Safe Areas & Virtual Keyboards

### Mobile Safe Areas (iPhone Notch & Dynamic Island)

```css
.bottom-dock {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
}

.top-header {
  padding-top: max(0.75rem, env(safe-area-inset-top));
}
```

### Dynamic Viewport Heights

Never use `100vh` on mobile web because the browser URL bar causes content cutoff:

```css
.full-screen-modal {
  height: 100vh; /* fallback */
  height: 100dvh; /* dynamic viewport height */
  max-height: -webkit-fill-available;
}
```
